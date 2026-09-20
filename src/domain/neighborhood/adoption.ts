import {
  WorldState,
  CatId,
  LotId,
  CommandContext,
  CommandResult,
  CatRecord,
  CatAppearance,
  PersonalityTrait,
  DomainEvent,
  TransferredCatRecord,
} from './types';

/**
 * Calculates current total capacity used by living cats and reserved litter slots.
 * Canonical engine schema uses `reservedSlots` on PregnancyRecord.
 */
export function getHouseholdCapacityUsed(state: WorldState): {
  livingCount: number;
  reservedSlots: number;
  reservedLitterSlots: number;
  totalUsed: number;
} {
  const livingCount = state.livingCatIds.length;
  let reservedSlots = 0;

  if (state.lifecycle && state.lifecycle.pregnancies) {
    for (const preg of Object.values(state.lifecycle.pregnancies)) {
      if (!preg) continue;
      const slots = preg.reservedSlots ?? (preg as any).reservedLitterSlots ?? 0;
      reservedSlots += Number.isFinite(slots) ? Math.max(0, slots) : 0;
    }
  }

  return {
    livingCount,
    reservedSlots,
    reservedLitterSlots: reservedSlots,
    totalUsed: livingCount + reservedSlots,
  };
}

/**
 * Checks whether a cat is actively pregnant using authoritative state records and cat.pregnancyId.
 */
export function isCatActivelyPregnant(state: WorldState, catId: CatId, cat: CatRecord): boolean {
  // 1. Authoritative pregnancy records in state.lifecycle.pregnancies
  if (state.lifecycle && state.lifecycle.pregnancies) {
    for (const [pregId, preg] of Object.entries(state.lifecycle.pregnancies)) {
      if (!preg) continue;
      // Direct pregnancy ID match
      if (cat.pregnancyId && (cat.pregnancyId === pregId || preg.id === cat.pregnancyId || (preg as any).pregnancyId === cat.pregnancyId)) {
        return true;
      }
      // Canonical PregnancyRecord: parentIds is [gestatingCatId, otherParentId]
      if (Array.isArray(preg.parentIds) && preg.parentIds.length > 0 && preg.parentIds[0] === catId) {
        return true;
      }
      // Legacy pregnancy motherId
      if ((preg as any).motherId === catId) {
        return true;
      }
    }
  }

  // 2. Direct pregnancyId on CatRecord
  if (cat.pregnancyId && typeof cat.pregnancyId === 'string' && cat.pregnancyId.trim().length > 0) {
    return true;
  }

  // 3. Legacy boolean flag fallback
  if (cat.isPregnant === true) {
    return true;
  }

  return false;
}

/**
 * Adopts a cat into the household.
 * Supports adopting from listed candidates or creating/adopting a custom cat.
 * Strictly respects 8-cat capacity including reserved litter slots.
 * Allows adoption into an empty household (0 living cats) after last-cat death.
 */
export function adoptCat(
  state: WorldState,
  payload: {
    candidateId?: string;
    name: string;
    appearance: CatAppearance;
    traits: PersonalityTrait[];
  },
  context: CommandContext
): CommandResult {
  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      state,
      error: { code: 'INVALID_PAYLOAD', message: 'Adoption payload is required.' },
    };
  }

  if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
    return {
      ok: false,
      state,
      error: { code: 'INVALID_NAME', message: 'Cat name must be a non-empty string.' },
    };
  }

  if (!payload.appearance || typeof payload.appearance !== 'object') {
    return {
      ok: false,
      state,
      error: { code: 'INVALID_APPEARANCE', message: 'Cat appearance must be provided.' },
    };
  }

  if (!Array.isArray(payload.traits)) {
    return {
      ok: false,
      state,
      error: { code: 'INVALID_TRAITS', message: 'Cat traits must be an array.' },
    };
  }

  const { totalUsed, livingCount, reservedSlots } = getHouseholdCapacityUsed(state);

  if (totalUsed >= 8) {
    return {
      ok: false,
      state,
      error: {
        code: 'HOUSEHOLD_FULL',
        message: `Household capacity limit reached (8 max, including ${state.livingCatIds.length} living cats and ${reservedSlots} reserved litter slots).`,
      },
    };
  }

  let adoptionFee = 0;
  let remainingCandidates = state.neighborhood.adoptionCandidates;

  if (payload.candidateId) {
    if (typeof payload.candidateId !== 'string' || !payload.candidateId.trim()) {
      return {
        ok: false,
        state,
        error: { code: 'INVALID_CANDIDATE_ID', message: 'Candidate ID must be a non-empty string.' },
      };
    }

    const candidate = state.neighborhood.adoptionCandidates.find(
      c => c.candidateId === payload.candidateId
    );
    if (!candidate) {
      return {
        ok: false,
        state,
        error: {
          code: 'CANDIDATE_NOT_FOUND',
          message: `Adoption candidate ${payload.candidateId} not found.`,
        },
      };
    }
    adoptionFee = Number.isFinite(candidate.adoptionFee) && candidate.adoptionFee > 0 ? candidate.adoptionFee : 0;
    remainingCandidates = state.neighborhood.adoptionCandidates.filter(
      c => c.candidateId !== payload.candidateId
    );
  }

  if (adoptionFee > 0 && (typeof state.economy.wallet.earnedCash !== 'number' || state.economy.wallet.earnedCash < adoptionFee)) {
    return {
      ok: false,
      state,
      error: {
        code: 'INSUFFICIENT_FUNDS',
        message: `Insufficient earned cash for adoption fee ($${adoptionFee} required, $${state.economy.wallet.earnedCash} available).`,
      },
    };
  }

  // Generate deterministic unique cat ID avoiding any collisions
  let newCatId = payload.candidateId
    ? `cat_${payload.candidateId}`
    : `cat_adopted_${state.clock.simMinute}_${state.nextEventSequence}`;

  let disambiguation = 0;
  while (
    state.cats[newCatId] ||
    state.livingCatIds.includes(newCatId) ||
    (state.neighborhood.npcCats && state.neighborhood.npcCats[newCatId])
  ) {
    disambiguation++;
    newCatId = `cat_adopted_${state.clock.simMinute}_${state.nextEventSequence}_${disambiguation}`;
  }

  const newCat: CatRecord = {
    id: newCatId,
    householdId: state.householdId,
    name: payload.name.trim(),
    appearance: { ...payload.appearance },
    baseAppearance: { ...payload.appearance },
    careerOutfit: null,
    isAtWork: false,
    traits: [...payload.traits],
    lifeStage: 'adult',
    ageDays: 30,
    ageMinutes: 30 * 1440,
    lifeStatus: 'living',
    needs: { hunger: 80, hygiene: 85, energy: 90, comfort: 85, social: 80, fun: 80, health: 100 },
    moodScore: 82,
    moodBand: 'happy',
    skills: { hunting: 3, agility: 3, charm: 3, crafting: 1 },
    position: { lotId: 'lot_home', x: 10, y: 10 },
    currentAction: null,
    lastRoute: [],
    relationships: {},
    isNpc: false,
    homeLotId: 'lot_home',
    isPregnant: false,
    createdAtSimMinute: state.clock.simMinute,
  };

  // Deduct fee from wallet exactly once if applicable
  const updatedWallet = {
    ...state.economy.wallet,
    earnedCash: Math.max(0, state.economy.wallet.earnedCash - adoptionFee),
  };

  const adoptEvent: DomainEvent = {
    id: `evt_adopt_${state.nextEventSequence}`,
    type: 'CAT_ADOPTED',
    sequence: state.nextEventSequence,
    simTime: state.clock.simMinute,
    actorIds: [newCatId],
    payload: {
      catId: newCatId,
      name: payload.name.trim(),
      adoptionFee,
      wasHouseholdEmpty: livingCount === 0,
    },
  };

  const newState: WorldState = {
    ...state,
    selectedCatId: state.selectedCatId || newCatId,
    livingCatIds: [...state.livingCatIds, newCatId],
    cats: {
      ...state.cats,
      [newCatId]: newCat,
    },
    economy: {
      ...state.economy,
      wallet: updatedWallet,
    },
    neighborhood: {
      ...state.neighborhood,
      adoptionCandidates: remainingCandidates,
    },
    events: [...state.events, adoptEvent],
    nextEventSequence: state.nextEventSequence + 1,
  };

  return { ok: true, state: newState, events: [adoptEvent] };
}

/**
 * Transfers an eligible adult household cat to a neighborhood NPC home lot without deletion.
 * Preserves the cat's stable ID, traits, relationships, ancestry, and career appearance.
 * Blocks transfer of kittens/adolescents, pregnant cats, deceased/ghost cats, invalid IDs,
 * wrong owner, and non-NPC residential destination lots.
 */
export function transferCatToNeighborhood(
  state: WorldState,
  catId: CatId,
  targetLotId: LotId,
  context: CommandContext
): CommandResult {
  if (!catId || typeof catId !== 'string' || !catId.trim()) {
    return {
      ok: false,
      state,
      error: {
        code: 'INVALID_CAT_ID',
        message: 'Cat ID must be a non-empty string.',
      },
    };
  }

  if (!state.livingCatIds.includes(catId)) {
    return {
      ok: false,
      state,
      error: {
        code: 'CAT_NOT_IN_HOUSEHOLD',
        message: `Cat ${catId} is not a living member of the household. Deceased, ghost, or non-household cats cannot be transferred.`,
      },
    };
  }

  const cat = state.cats[catId];
  if (!cat) {
    return {
      ok: false,
      state,
      error: { code: 'CAT_NOT_FOUND', message: `Cat ${catId} not found.` },
    };
  }

  if (cat.lifeStatus !== 'living') {
    return {
      ok: false,
      state,
      error: {
        code: 'CAT_NOT_IN_HOUSEHOLD',
        message: `Cat ${catId} has status ${cat.lifeStatus}. Deceased or ghost cats cannot be transferred.`,
      },
    };
  }

  if (cat.householdId && state.householdId && cat.householdId !== state.householdId) {
    return {
      ok: false,
      state,
      error: {
        code: 'CAT_NOT_IN_HOUSEHOLD',
        message: `Cat ${catId} belongs to household ${cat.householdId}, not active household ${state.householdId}.`,
      },
    };
  }

  if (cat.isNpc === true) {
    return {
      ok: false,
      state,
      error: {
        code: 'CAT_NOT_IN_HOUSEHOLD',
        message: `Cat ${catId} is already a neighborhood NPC.`,
      },
    };
  }

  // Reject double ID collision if catId already exists as an NPC
  if (state.neighborhood.npcCats && state.neighborhood.npcCats[catId]) {
    return {
      ok: false,
      state,
      error: {
        code: 'DUPLICATE_CAT_ID',
        message: `Cat ID ${catId} already exists in neighborhood NPC records.`,
      },
    };
  }

  // Safety check: kittens and adolescents cannot transfer independently
  if (cat.lifeStage === 'kitten' || cat.lifeStage === 'adolescent') {
    return {
      ok: false,
      state,
      error: {
        code: 'UNSAFE_KITTEN_TRANSFER',
        message: `Kittens and adolescents (${cat.name}) cannot move out independently before reaching adulthood.`,
      },
    };
  }

  // Safety check: active pregnancy blocks transfer until birth
  if (isCatActivelyPregnant(state, catId, cat)) {
    return {
      ok: false,
      state,
      error: {
        code: 'PREGNANT_TRANSFER_DEFERRED',
        message: `Pregnant cat ${cat.name} cannot move out until after giving birth.`,
      },
    };
  }

  // Validate destination lot
  if (!targetLotId || typeof targetLotId !== 'string' || !targetLotId.trim()) {
    return {
      ok: false,
      state,
      error: {
        code: 'INVALID_TRANSFER_DESTINATION',
        message: 'Target lot ID must be a non-empty string.',
      },
    };
  }

  const targetLot = state.neighborhood.lots[targetLotId];
  if (!targetLot || targetLot.type !== 'npc_home') {
    return {
      ok: false,
      state,
      error: {
        code: 'INVALID_TRANSFER_DESTINATION',
        message: `Target lot ${targetLotId} is not a valid NPC residential home.`,
      },
    };
  }

  if (targetLotId === 'lot_home' || targetLotId === cat.homeLotId || targetLotId === cat.position?.lotId) {
    return {
      ok: false,
      state,
      error: {
        code: 'INVALID_TRANSFER_DESTINATION',
        message: `Cannot transfer cat ${cat.name} to its current lot ${targetLotId}. Destination must be a different NPC home.`,
      },
    };
  }

  // 1. Remove from living household cat IDs and household cats record
  const newLivingCatIds = state.livingCatIds.filter(id => id !== catId);
  const newHouseholdCats = { ...state.cats };
  delete newHouseholdCats[catId];

  // 2. Prepare converted NPC record maintaining ALL attributes, ancestry, relationships, and career appearance
  const transferredNpcCat: CatRecord = {
    ...cat,
    householdId: undefined,
    appearance: { ...cat.appearance },
    baseAppearance: cat.baseAppearance ? { ...cat.baseAppearance } : { ...cat.appearance },
    careerOutfit: cat.careerOutfit ? { ...cat.careerOutfit } : null,
    isAtWork: false,
    traits: [...cat.traits],
    skills: { ...cat.skills },
    relationships: { ...cat.relationships },
    motherId: cat.motherId,
    fatherId: cat.fatherId,
    familyTree: cat.familyTree ? {
      motherId: cat.familyTree.motherId ?? cat.motherId,
      fatherId: cat.familyTree.fatherId ?? cat.fatherId,
      partnerId: cat.familyTree.partnerId,
      offspringIds: cat.familyTree.offspringIds ? [...cat.familyTree.offspringIds] : undefined,
    } : (cat.motherId || cat.fatherId ? { motherId: cat.motherId, fatherId: cat.fatherId } : undefined),
    isNpc: true,
    homeLotId: targetLotId,
    position: {
      lotId: targetLotId,
      x: 5,
      y: 5,
    },
    currentAction: null,
    lastRoute: [],
  };

  // 3. Track transfer history record
  const transferRecord: TransferredCatRecord = {
    catId,
    originalHouseholdId: state.householdId,
    transferredAtSimMinute: state.clock.simMinute,
    newHomeLotId: targetLotId,
  };

  // 4. Update target lot resident IDs
  const updatedTargetLot: typeof targetLot = {
    ...targetLot,
    residentCatIds: [...(targetLot.residentCatIds || []), catId],
  };

  const transferEvent: DomainEvent = {
    id: `evt_transfer_${state.nextEventSequence}`,
    type: 'CAT_TRANSFERRED_TO_NEIGHBORHOOD',
    sequence: state.nextEventSequence,
    simTime: state.clock.simMinute,
    actorIds: [catId],
    payload: {
      catId,
      name: cat.name,
      originHouseholdId: state.householdId,
      targetLotId,
    },
  };

  const newState: WorldState = {
    ...state,
    selectedCatId: state.selectedCatId === catId ? (newLivingCatIds[0] || null) : state.selectedCatId,
    livingCatIds: newLivingCatIds,
    cats: newHouseholdCats,
    neighborhood: {
      ...state.neighborhood,
      lots: {
        ...state.neighborhood.lots,
        [targetLotId]: updatedTargetLot,
      },
      npcCats: {
        ...state.neighborhood.npcCats,
        [catId]: transferredNpcCat,
      },
      transferredCats: {
        ...state.neighborhood.transferredCats,
        [catId]: transferRecord,
      },
    },
    events: [...state.events, transferEvent],
    nextEventSequence: state.nextEventSequence + 1,
  };

  return { ok: true, state: newState, events: [transferEvent] };
}
