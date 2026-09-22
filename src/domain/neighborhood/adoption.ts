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
 */
export function getHouseholdCapacityUsed(state: WorldState): {
  livingCount: number;
  reservedLitterSlots: number;
  totalUsed: number;
} {
  const livingCount = state.livingCatIds.length;
  let reservedLitterSlots = 0;

  if (state.lifecycle && state.lifecycle.pregnancies) {
    for (const pregId of Object.keys(state.lifecycle.pregnancies)) {
      reservedLitterSlots += state.lifecycle.pregnancies[pregId].reservedLitterSlots;
    }
  }

  return {
    livingCount,
    reservedLitterSlots,
    totalUsed: livingCount + reservedLitterSlots,
  };
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
  const { totalUsed, livingCount } = getHouseholdCapacityUsed(state);

  if (totalUsed >= 8) {
    return {
      ok: false,
      state,
      error: {
        code: 'HOUSEHOLD_FULL',
        message: `Household capacity limit reached (8 max, including ${state.livingCatIds.length} living cats and reserved litter slots).`,
      },
    };
  }

  let adoptionFee = 0;
  let remainingCandidates = state.neighborhood.adoptionCandidates;

  if (payload.candidateId) {
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
    adoptionFee = candidate.adoptionFee;
    remainingCandidates = state.neighborhood.adoptionCandidates.filter(
      c => c.candidateId !== payload.candidateId
    );
  }

  if (adoptionFee > 0 && state.economy.wallet.earnedCash < adoptionFee) {
    return {
      ok: false,
      state,
      error: {
        code: 'INSUFFICIENT_FUNDS',
        message: `Insufficient earned cash for adoption fee ($${adoptionFee} required, $${state.economy.wallet.earnedCash} available).`,
      },
    };
  }

  // Generate deterministic unique cat ID using simMinute and sequence counter
  const newCatId = `cat_adopted_${state.clock.simMinute}_${state.nextEventSequence}`;

  const newCat: CatRecord = {
    id: newCatId,
    name: payload.name,
    appearance: payload.appearance,
    traits: payload.traits,
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
  };

  // Deduct fee from wallet if applicable
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
      name: payload.name,
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
 * Preserves the cat's stable ID, traits, relationships, and history.
 * Blocks transfer of kittens/adolescents, pregnant cats, deceased/ghost cats, and last remaining cat if unconfirmed.
 */
export function transferCatToNeighborhood(
  state: WorldState,
  catId: CatId,
  targetLotId: LotId,
  context: CommandContext
): CommandResult {
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

  // Safety checks
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

  if (cat.isPregnant) {
    return {
      ok: false,
      state,
      error: {
        code: 'PREGNANT_TRANSFER_DEFERRED',
        message: `Pregnant cat ${cat.name} cannot move out until after giving birth.`,
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

  // 1. Remove from living household cat IDs and household cats record
  const newLivingCatIds = state.livingCatIds.filter(id => id !== catId);
  const newHouseholdCats = { ...state.cats };
  delete newHouseholdCats[catId];

  // 2. Prepare converted NPC record maintaining ALL attributes & stable ID
  const transferredNpcCat: CatRecord = {
    ...cat,
    isNpc: true,
    homeLotId: targetLotId,
    position: {
      lotId: targetLotId,
      x: 5,
      y: 5,
    },
    currentAction: null,
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
