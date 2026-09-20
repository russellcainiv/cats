import { WorldState } from '../../../src/domain/neighborhood/types';
import { initializeNeighborhoodState } from '../../../src/domain/neighborhood/index';

export function createTestWorldState(overrides?: Partial<WorldState>): WorldState {
  const defaultState: WorldState = {
    schemaVersion: 1,
    catalogVersion: 1,
    householdId: 'house_test_01',
    householdName: 'Test Whisker Haven',
    ownerId: 'usr_test_owner',
    revision: 1,
    clock: {
      simMinute: 600, // 10:00 AM
      isPaused: false,
      speed: 1,
    },
    rng: {
      seed: 12345,
      counter: 0,
      serializedState: '12345',
    },
    selectedCatId: 'cat_player_1',
    livingCatIds: ['cat_player_1'],
    cats: {
      cat_player_1: {
        id: 'cat_player_1',
        name: 'Milo',
        appearance: { bodyColor: '#E67E22', pattern: 'tabby', eyeColor: '#2ECC71' },
        traits: ['playful', 'curious'],
        lifeStage: 'adult',
        ageDays: 30,
        ageMinutes: 30 * 1440,
        lifeStatus: 'living',
        needs: { hunger: 80, hygiene: 80, energy: 80, comfort: 80, social: 80, fun: 80, health: 100 },
        moodScore: 80,
        moodBand: 'happy',
        skills: { hunting: 1, agility: 1, charm: 1, crafting: 1 },
        position: { lotId: 'lot_home', x: 10, y: 10 },
        currentAction: null,
        lastRoute: [],
        relationships: {},
        isNpc: false,
        homeLotId: 'lot_home',
      },
    },
    building: {
      lots: {},
      activeFreeBuild: false,
    },
    social: {
      recentInteractions: [],
    },
    economy: {
      wallet: {
        earnedCash: 500,
        freeBuildCash: 0,
        mode: 'normal',
      },
      inventory: {},
      careers: {},
      cafe: {
        owned: true,
        recipes: [],
        supplies: {},
        dailyRevenue: 0,
      },
      goals: {},
    },
    neighborhood: initializeNeighborhoodState(),
    lifecycle: {
      pregnancies: {},
      memorials: {},
      ghosts: [],
    },
    commandReceipts: [],
    events: [],
    nextEventSequence: 1,
  };

  return {
    ...defaultState,
    ...overrides,
  };
}
