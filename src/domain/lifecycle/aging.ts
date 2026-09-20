// src/domain/lifecycle/aging.ts
// Fixed lifespan stage calculations, aging ticks, natural death, and terminal state transitions.

import {
  WorldState,
  CatRecord,
  LifeStage,
  DomainEvent,
  MemorialRecord,
} from './types';

// Total 150 days = 216,000 sim minutes (1 day = 1440 sim minutes)
export const KITTEN_STAGE_DAYS = 10; // 0 to 10 days (0..14400 mins)
export const ADOLESCENT_STAGE_DAYS = 20; // 10 to 30 days (14400..43200 mins)
export const ADULT_STAGE_DAYS = 95; // 30 to 125 days (43200..180000 mins)
export const ELDER_STAGE_DAYS = 25; // 125 to 150 days (180000..216000 mins)

export const LIFESPAN_TOTAL_DAYS = 150;
export const LIFESPAN_TOTAL_MINUTES = LIFESPAN_TOTAL_DAYS * 24 * 60; // 216000 mins

export const MINUTES_PER_DAY = 1440;

/**
 * Calculates LifeStage from age in sim minutes.
 */
export function getLifeStageForAgeMinutes(ageMinutes: number): LifeStage {
  const days = ageMinutes / MINUTES_PER_DAY;
  if (days < KITTEN_STAGE_DAYS) {
    return 'kitten';
  } else if (days < KITTEN_STAGE_DAYS + ADOLESCENT_STAGE_DAYS) {
    return 'adolescent';
  } else if (days < KITTEN_STAGE_DAYS + ADOLESCENT_STAGE_DAYS + ADULT_STAGE_DAYS) {
    return 'adult';
  } else {
    return 'elder';
  }
}

/**
 * Executes a terminal death transition for a cat:
 * - Updates lifeStatus to 'deceased'
 * - Sets causeOfDeath and deceasedAtSimMinute
 * - Cancels current actions, clears job/work assignments
 * - Removes from livingCatIds (releasing capacity slot)
 * - Retains identity, history, family relations, and creates a Memorial record
 * - Retains home/money for final cat death and emits adoption eligibility event if living count becomes 0
 */
export function processCatDeath(
  state: WorldState,
  catId: string,
  causeOfDeath: string,
  deceasedAtMinute: number
): { state: WorldState; events: DomainEvent[] } {
  const cat = state.cats[catId];
  if (!cat || cat.lifeStatus !== 'living') {
    return { state, events: [] };
  }

  const events: DomainEvent[] = [];
  let nextSeq = state.nextEventSequence;

  // Mark cat as deceased
  const updatedCat: CatRecord = {
    ...cat,
    lifeStatus: 'deceased',
    causeOfDeath,
    deceasedAtSimMinute: deceasedAtMinute,
    currentAction: null,
    jobId: null,
  };

  const updatedCats = {
    ...state.cats,
    [catId]: updatedCat,
  };

  const updatedLivingCatIds = state.livingCatIds.filter(id => id !== catId);

  // If selected cat was deceased, clear selection or pick another living cat
  const newSelectedCatId =
    state.selectedCatId === catId
      ? updatedLivingCatIds.length > 0
        ? updatedLivingCatIds[0]
        : null
      : state.selectedCatId;

  // Create Memorial Record
  const memorialId = `mem_${catId}_${deceasedAtMinute}`;
  const newMemorial: MemorialRecord = {
    id: memorialId,
    deceasedCatId: catId,
    catName: cat.name,
    appearance: cat.appearance,
    traits: cat.traits,
    ageAtDeathMinutes: cat.ageMinutes,
    causeOfDeath,
    deceasedAtSimMinute: deceasedAtMinute,
    tombstonePosition: {
      lotId: cat.position.lotId || 'lot_home',
      x: cat.position.x,
      y: cat.position.y,
    },
    ghostVisits: [],
  };

  const updatedMemorials = {
    ...state.lifecycle.memorials,
    [memorialId]: newMemorial,
  };

  // Emit CAT_DIED event
  const deathEvent: DomainEvent = {
    id: `evt_death_${catId}_${deceasedAtMinute}`,
    type: 'CAT_DIED',
    sequence: nextSeq++,
    simTime: deceasedAtMinute,
    actorIds: [catId],
    payload: {
      catId,
      catName: cat.name,
      causeOfDeath,
      ageMinutes: cat.ageMinutes,
      ageDays: cat.ageDays,
      memorialId,
    },
  };
  events.push(deathEvent);

  // If last cat died, emit FINAL_CAT_DIED event (retains home/money, offers adoption)
  if (updatedLivingCatIds.length === 0) {
    const finalDeathEvent: DomainEvent = {
      id: `evt_final_death_${deceasedAtMinute}`,
      type: 'FINAL_CAT_DIED',
      sequence: nextSeq++,
      simTime: deceasedAtMinute,
      actorIds: [catId],
      payload: {
        message: 'All household cats have passed away. Home and money are preserved. Adoption is now available.',
        adoptionAvailable: true,
      },
    };
    events.push(finalDeathEvent);
  }

  const newState: WorldState = {
    ...state,
    cats: updatedCats,
    livingCatIds: updatedLivingCatIds,
    selectedCatId: newSelectedCatId,
    lifecycle: {
      ...state.lifecycle,
      memorials: updatedMemorials,
    },
    nextEventSequence: nextSeq,
    events: [...state.events, ...events],
  };

  return { state: newState, events };
}

/**
 * Advances aging for all living cats in active simulation time.
 * If simulation is paused or elapsedSimMinutes <= 0, no aging occurs.
 */
export function processAgingTick(
  state: WorldState,
  elapsedSimMinutes: number
): { state: WorldState; events: DomainEvent[] } {
  if (state.clock.isPaused || elapsedSimMinutes <= 0) {
    return { state, events: [] };
  }

  let currentWorld = { ...state };
  const allEvents: DomainEvent[] = [];

  const livingIds = [...currentWorld.livingCatIds];

  for (const catId of livingIds) {
    const cat = currentWorld.cats[catId];
    if (!cat || cat.lifeStatus !== 'living') continue;

    const oldAgeMinutes = cat.ageMinutes;
    const newAgeMinutes = oldAgeMinutes + elapsedSimMinutes;
    const newAgeDays = Math.floor(newAgeMinutes / MINUTES_PER_DAY);
    const oldStage = cat.lifeStage;
    const newStage = getLifeStageForAgeMinutes(newAgeMinutes);

    // Check if natural death threshold reached (150 days = 216,000 mins)
    if (newAgeMinutes >= LIFESPAN_TOTAL_MINUTES) {
      // Process old age death
      const { state: nextState, events: deathEvents } = processCatDeath(
        currentWorld,
        catId,
        'old_age',
        currentWorld.clock.simMinute
      );
      currentWorld = nextState;
      allEvents.push(...deathEvents);
    } else {
      // Update cat age and stage
      const updatedCat: CatRecord = {
        ...cat,
        ageMinutes: newAgeMinutes,
        ageDays: newAgeDays,
        lifeStage: newStage,
      };

      currentWorld = {
        ...currentWorld,
        cats: {
          ...currentWorld.cats,
          [catId]: updatedCat,
        },
      };

      // Emit stage transition event if lifeStage changed
      if (oldStage !== newStage) {
        const stageEvent: DomainEvent = {
          id: `evt_stage_${catId}_${newStage}_${currentWorld.clock.simMinute}`,
          type: 'LIFE_STAGE_CHANGED',
          sequence: currentWorld.nextEventSequence++,
          simTime: currentWorld.clock.simMinute,
          actorIds: [catId],
          payload: {
            catId,
            oldStage,
            newStage,
            ageDays: newAgeDays,
          },
        };
        allEvents.push(stageEvent);
        currentWorld.events = [...currentWorld.events, stageEvent];
      }
    }
  }

  return { state: currentWorld, events: allEvents };
}
