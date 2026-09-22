// tests/domain/lifecycle/harness.ts
// Synthetic test harness and world state generators for lifecycle domain unit testing.

import {
  WorldState,
  CatRecord,
  PregnancyRecord,
  LifecycleSubsystemState,
  DomainEvent,
  CommandContext,
} from '../../src/domain/lifecycle/types';

export function createSeededRng(seed: number = 12345) {
  let s = seed;
  return {
    next: () => {
      // Linear Congruential Generator (LCG)
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    },
    getSeed: () => seed,
    getCounter: () => s,
  };
}

export function createTestCat(overrides: Partial<CatRecord> = {}): CatRecord {
  const id = overrides.id || `cat_${Math.random().toString(36).substring(2, 9)}`;
  return {
    id,
    householdId: 'hh_test',
    name: overrides.name || 'TestCat',
    appearance: overrides.appearance || {
      coatColor: 'orange',
      coatPattern: 'tabby',
      eyeColor: 'green',
    },
    traits: overrides.traits || ['playful', 'curious'],
    lifeStage: overrides.lifeStage || 'adult',
    ageDays: overrides.ageDays !== undefined ? overrides.ageDays : 40,
    ageMinutes: overrides.ageMinutes !== undefined ? overrides.ageMinutes : 40 * 1440,
    lifeStatus: overrides.lifeStatus || 'living',
    needs: overrides.needs || {
      hunger: 80,
      energy: 80,
      hygiene: 80,
      social: 80,
      fun: 80,
      bladder: 80,
    },
    skills: overrides.skills || {
      hunting: 1,
      climbing: 1,
      socializing: 1,
      charisma: 1,
    },
    position: overrides.position || { lotId: 'lot_home', x: 5, y: 5 },
    currentAction: overrides.currentAction !== undefined ? overrides.currentAction : null,
    family: overrides.family || {
      sireId: null,
      damId: null,
      childIds: [],
      generation: 1,
    },
    health: overrides.health || {
      isIll: false,
      hasActiveHazard: false,
      warningIssued: false,
    },
    jobId: overrides.jobId !== undefined ? overrides.jobId : null,
  };
}

export function createTestWorldState(overrides: Partial<WorldState> = {}): WorldState {
  const cat1 = createTestCat({ id: 'cat_dam', name: 'Dam', lifeStage: 'adult' });
  const cat2 = createTestCat({ id: 'cat_sire', name: 'Sire', lifeStage: 'adult' });

  const defaultCats: Record<string, CatRecord> = {
    cat_dam: cat1,
    cat_sire: cat2,
  };

  const cats = overrides.cats || defaultCats;
  const livingCatIds = overrides.livingCatIds || Object.keys(cats).filter(id => cats[id].lifeStatus === 'living');

  const lifecycle: LifecycleSubsystemState = overrides.lifecycle || {
    pregnancies: {},
    memorials: {},
    ghosts: [],
  };

  return {
    schemaVersion: 1,
    catalogVersion: 1,
    householdId: 'hh_test',
    householdName: 'Whisker Haven',
    ownerId: 'user_test',
    revision: 1,
    clock: overrides.clock || { simMinute: 1000, isPaused: false, speed: 1 },
    rng: overrides.rng || { seed: 12345, counter: 0 },
    selectedCatId: livingCatIds[0] || null,
    livingCatIds,
    cats,
    lifecycle,
    events: overrides.events || [],
    nextEventSequence: overrides.nextEventSequence || 1,
  };
}

export function createTestCommandContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    actorId: overrides.actorId || 'user_test',
    commandId: overrides.commandId || `cmd_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: overrides.timestamp || Date.now(),
  };
}
