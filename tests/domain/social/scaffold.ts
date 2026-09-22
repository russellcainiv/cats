// tests/domain/social/scaffold.ts
// Synthetic test scaffold for creating test world states, cats, and rng state.

import {
  WorldState,
  CatRecord,
  SocialSubsystemState,
  PregnancyRecord,
  CatId,
  PersonalityTrait,
  LifeStage,
  LifeStatus,
  CatNeeds,
  CatSkills,
  CatPosition,
  CatAppearance,
  CommandContext
} from '../../../src/domain/social/index';

export function createTestCat(
  id: CatId,
  name: string,
  overrides?: Partial<CatRecord>
): CatRecord {
  const defaultNeeds: CatNeeds = {
    hunger: 80,
    hygiene: 80,
    energy: 80,
    comfort: 80,
    social: 70,
    fun: 70,
    health: 90
  };

  const defaultSkills: CatSkills = {
    painting: 0,
    gardening: 0,
    cooking: 0,
    social: 1
  };

  const defaultPosition: CatPosition = {
    lotId: 'home_lot',
    x: 5,
    y: 5
  };

  const defaultAppearance: CatAppearance = {
    coatStyle: 'tabby',
    primaryColor: 'orange',
    secondaryColor: 'white',
    eyeColor: 'green'
  };

  return {
    id,
    name,
    appearance: defaultAppearance,
    traits: ['playful', 'affectionate'],
    lifeStage: 'adult',
    ageMinutes: 20 * 24 * 60, // adult age
    lifeStatus: 'living',
    householdId: 'test_household',
    needs: defaultNeeds,
    skills: defaultSkills,
    position: defaultPosition,
    currentAction: null,
    isPregnant: false,
    isWorking: false,
    isIll: false,
    ...overrides
  };
}

export function createInitialTestSocialState(): SocialSubsystemState {
  return {
    recentInteractions: [],
    relationships: {},
    memories: {},
    inProgressActions: [],
    pairCooldowns: {},
    completedActionIds: []
  };
}

export function createTestWorldState(cats: CatRecord[] = []): WorldState {
  const catRecordMap: Record<CatId, CatRecord> = {};
  const livingIds: CatId[] = [];

  for (const c of cats) {
    catRecordMap[c.id] = c;
    if (c.lifeStatus === 'living') {
      livingIds.push(c.id);
    }
  }

  return {
    schemaVersion: 1,
    catalogVersion: 1,
    householdId: 'test_household',
    householdName: 'My Cats',
    ownerId: 'owner_1',
    revision: 1,
    clock: { simMinute: 100, isPaused: false, speed: 1 },
    rng: { seed: 12345, counter: 0 },
    selectedCatId: cats[0]?.id || null,
    livingCatIds: livingIds,
    cats: catRecordMap,
    building: {
      lots: {},
      activeFreeBuild: false
    },
    social: createInitialTestSocialState(),
    economy: {
      wallet: { earnedCash: 500, freeBuildCash: 0, mode: 'normal' },
      inventory: {},
      careers: {},
      cafe: {},
      goals: {}
    },
    neighborhood: {
      activeLotId: 'home_lot',
      npcCats: {}
    },
    lifecycle: {
      pregnancies: {},
      memorials: {},
      ghosts: []
    },
    commandReceipts: [],
    events: [],
    nextEventSequence: 1
  };
}

export function createTestContext(commandId: string = 'cmd_1'): CommandContext {
  return {
    actorId: 'owner_1',
    commandId,
    timestamp: Date.now()
  };
}
