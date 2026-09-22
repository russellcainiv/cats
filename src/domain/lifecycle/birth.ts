// src/domain/lifecycle/birth.ts
// Gestation progress, pregnancy cancellation, and birth resolution logic.

import {
  WorldState,
  PregnancyRecord,
  CommandContext,
  CommandResult,
  CatRecord,
  DomainEvent,
  LifecycleCommand,
} from './types';

import { inheritAppearance, inheritTraits, nextRng } from './genetics';

export const GESTATION_MINUTES = 3 * 24 * 60; // 3 sim days = 4320 sim minutes
export const MAX_HOUSEHOLD_CAPACITY = 8;

/**
 * Calculates current total capacity used: living cats + reserved slots in unresolved pregnancies.
 */
export function getOccupiedHouseholdSlots(state: WorldState): number {
  const livingCount = state.livingCatIds.length;
  let reservedSlots = 0;

  for (const preg of Object.values(state.lifecycle.pregnancies)) {
    if (!preg.resolved) {
      reservedSlots += preg.litterSize;
    }
  }

  return livingCount + reservedSlots;
}

/**
 * Handles automatic pregnancy state updates during time advance.
 * If a pregnancy carrier (dam) is deceased or moved out, cancels pregnancy and releases reserved litter slots.
 */
export function processGestationTick(
  state: WorldState,
  elapsedSimMinutes: number
): { state: WorldState; events: DomainEvent[] } {
  let updatedState = { ...state };
  const events: DomainEvent[] = [];
  const currentSimMinute = updatedState.clock.simMinute;

  const newPregnancies: Record<string, PregnancyRecord> = { ...updatedState.lifecycle.pregnancies };
  let modified = false;

  for (const pregId of Object.keys(newPregnancies)) {
    const preg = newPregnancies[pregId];
    if (preg.resolved) continue;

    const dam = updatedState.cats[preg.damId];

    // Check if dam died or moved out
    if (!dam || dam.lifeStatus !== 'living') {
      // Pregnancy cancelled due to carrier death/absence
      newPregnancies[pregId] = {
        ...preg,
        resolved: true,
      };
      modified = true;

      const event: DomainEvent = {
        id: `evt_preg_cancel_${pregId}_${currentSimMinute}`,
        type: 'PREGNANCY_CANCELLED',
        sequence: updatedState.nextEventSequence++,
        simTime: currentSimMinute,
        actorIds: [preg.damId],
        payload: {
          pregnancyId: pregId,
          damId: preg.damId,
          reason: !dam ? 'dam_not_found' : `dam_status_${dam.lifeStatus}`,
          releasedSlots: preg.litterSize,
        },
      };
      events.push(event);
    }
  }

  if (modified) {
    updatedState = {
      ...updatedState,
      lifecycle: {
        ...updatedState.lifecycle,
        pregnancies: newPregnancies,
      },
      events: [...updatedState.events, ...events],
    };
  }

  return { state: updatedState, events };
}

/**
 * Handles TRIGGER_BIRTH command: exchanges reserved pregnancy slots for 1-3 new living kittens.
 */
export function executeBirth(
  state: WorldState,
  command: Extract<LifecycleCommand, { type: 'TRIGGER_BIRTH' }>,
  context: CommandContext
): CommandResult {
  const { pregnancyId, kittenNames } = command.payload;
  const preg = state.lifecycle.pregnancies[pregnancyId];

  if (!preg) {
    return {
      ok: false,
      state,
      error: { code: 'PREGNANCY_NOT_FOUND', message: `Pregnancy ${pregnancyId} does not exist.` },
    };
  }

  if (preg.resolved) {
    return {
      ok: false,
      state,
      error: { code: 'PREGNANCY_ALREADY_RESOLVED', message: `Pregnancy ${pregnancyId} has already been resolved.` },
    };
  }

  const dam = state.cats[preg.damId];
  if (!dam || dam.lifeStatus !== 'living') {
    return {
      ok: false,
      state,
      error: { code: 'DAM_UNAVAILABLE', message: `Dam ${preg.damId} is not alive.` },
    };
  }

  // Check capacity invariant: living count + (reserved - litterSize) + kittens <= 8
  // Since reserved slots were already reserved during pregnancy creation, swapping reserved slots for kittens is 1-to-1 or less.
  const currentLiving = state.livingCatIds.length;

  // Actual kittens born is preg.litterSize (1-3)
  const litterCount = preg.litterSize;
  if (currentLiving + litterCount > MAX_HOUSEHOLD_CAPACITY) {
    return {
      ok: false,
      state,
      error: { code: 'CAPACITY_EXCEEDED', message: `Household cannot exceed ${MAX_HOUSEHOLD_CAPACITY} total living cats.` },
    };
  }

  const sire = preg.sireId ? state.cats[preg.sireId] ?? null : null;
  const damGen = dam.family?.generation ?? 1;
  const sireGen = sire?.family?.generation ?? 1;
  const kittenGen = Math.max(damGen, sireGen) + 1;

  let currentRng = state.rng;
  const newCats: Record<string, CatRecord> = { ...state.cats };
  const newLivingCatIds = [...state.livingCatIds];
  const bornKittenIds: string[] = [];
  const events: DomainEvent[] = [];
  let nextSeq = state.nextEventSequence;

  for (let i = 0; i < litterCount; i++) {
    const kittenId = `cat_kitten_${pregnancyId}_${i + 1}`;
    const defaultName = kittenNames && kittenNames[i] ? kittenNames[i] : `Kitten ${i + 1}`;

    const [appearance, rng1] = inheritAppearance(dam, sire, currentRng);
    const [traits, rng2] = inheritTraits(dam, sire, rng1);
    currentRng = rng2;

    const kitten: CatRecord = {
      id: kittenId,
      householdId: state.householdId,
      name: defaultName,
      appearance,
      traits,
      lifeStage: 'kitten',
      ageDays: 0,
      ageMinutes: 0,
      lifeStatus: 'living',
      needs: {
        hunger: 100,
        energy: 100,
        hygiene: 100,
        social: 100,
        fun: 100,
        bladder: 100,
      },
      skills: {
        hunting: 0,
        climbing: 0,
        socializing: 0,
        charisma: 0,
      },
      position: { ...dam.position },
      currentAction: null,
      family: {
        sireId: preg.sireId,
        damId: preg.damId,
        childIds: [],
        generation: kittenGen,
      },
      health: {
        isIll: false,
        hasActiveHazard: false,
        warningIssued: false,
      },
      jobId: null,
    };

    newCats[kittenId] = kitten;
    newLivingCatIds.push(kittenId);
    bornKittenIds.push(kittenId);
  }

  // Update dam and sire family childIds
  const updatedDam: CatRecord = {
    ...dam,
    family: {
      ...dam.family,
      childIds: Array.from(new Set([...(dam.family?.childIds || []), ...bornKittenIds])),
    },
  };
  newCats[dam.id] = updatedDam;

  if (sire) {
    const updatedSire: CatRecord = {
      ...sire,
      family: {
        ...sire.family,
        childIds: Array.from(new Set([...(sire.family?.childIds || []), ...bornKittenIds])),
      },
    };
    newCats[sire.id] = updatedSire;
  }

  // Mark pregnancy as resolved
  const updatedPregnancies = {
    ...state.lifecycle.pregnancies,
    [pregnancyId]: {
      ...preg,
      resolved: true,
    },
  };

  // Domain event
  const birthEvent: DomainEvent = {
    id: `evt_birth_${pregnancyId}_${state.clock.simMinute}`,
    type: 'KITTENS_BORN',
    sequence: nextSeq++,
    simTime: state.clock.simMinute,
    actorIds: [preg.damId, ...bornKittenIds],
    payload: {
      pregnancyId,
      damId: preg.damId,
      sireId: preg.sireId,
      kittenIds: bornKittenIds,
      litterSize: litterCount,
      generation: kittenGen,
    },
  };
  events.push(birthEvent);

  const newState: WorldState = {
    ...state,
    rng: currentRng,
    livingCatIds: newLivingCatIds,
    cats: newCats,
    lifecycle: {
      ...state.lifecycle,
      pregnancies: updatedPregnancies,
    },
    nextEventSequence: nextSeq,
    events: [...state.events, ...events],
  };

  return { ok: true, state: newState, events };
}
