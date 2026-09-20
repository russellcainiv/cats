// work/building/harness.ts
// Synthetic scaffolding and test harness helpers for Building Subsystem development & tests

export type {
  CatId,
  LotId,
  ObjectId,
  HouseholdId,
  EventId,
  CommandId,
  FurnitureCategory,
  GridCell,
  CatPosition,
  CatRecord,
  CatalogItem,
  LotObject,
  WallSegment,
  DoorItem,
  WindowItem,
  FloorFinishSegment,
  WorldLot,
  Wallet,
  InventoryItem,
  SimClock,
  RngStateData,
  CommandReceipt,
  DomainEvent,
  UndoRedoEntry,
  UndoRedoStack,
  BuildingSubsystemState,
  WorldState,
  CommandContext,
  CommandResult,
  CommandResultSuccess,
  CommandResultFailure,
  BuildingCommand,
} from '../../src/domain/building/types';

import type { WorldState, WorldLot } from '../../src/domain/building/types';

export function createInitialWorldState(overrides?: Partial<WorldState>): WorldState {
  const homeLot: WorldLot = {
    id: 'lot_home',
    type: 'home',
    name: 'Cozy Cat Home',
    width: 20,
    height: 20,
    blockedCells: [],
    walls: [
      { id: 'w1', x1: 2, y1: 2, x2: 18, y2: 2, provenance: 'earned' },
      { id: 'w2', x1: 18, y1: 2, x2: 18, y2: 18, provenance: 'earned' },
      { id: 'w3', x1: 18, y1: 18, x2: 2, y2: 18, provenance: 'earned' },
      { id: 'w4', x1: 2, y1: 18, x2: 2, y2: 2, provenance: 'earned' },
    ],
    doors: [
      { id: 'd1', x: 10, y: 18, orientation: 'horizontal', provenance: 'earned' }
    ],
    windows: [],
    floorFinishes: [],
    objects: []
  };

  return {
    schemaVersion: 1,
    catalogVersion: 1,
    householdId: 'hh_1',
    householdName: 'Whiskers Haven',
    ownerId: 'user_1',
    revision: 1,
    clock: { simMinute: 100, isPaused: false, speed: 1 },
    rng: { seed: 12345, counter: 0, serializedState: '12345' },
    selectedCatId: 'cat_1',
    livingCatIds: ['cat_1'],
    cats: {
      cat_1: {
        id: 'cat_1',
        name: 'Mochi',
        position: { lotId: 'lot_home', x: 10, y: 10 }
      }
    },
    building: {
      lots: {
        lot_home: homeLot
      },
      activeFreeBuild: false,
      undoStack: {
        lot_home: { past: [], future: [] }
      }
    },
    social: {},
    economy: {
      wallet: {
        earnedCash: 1000,
        freeBuildCash: 999999,
        mode: 'normal'
      },
      inventory: {},
      careers: {},
      cafe: {},
      goals: {}
    },
    neighborhood: {
      activeLotId: 'lot_home',
      npcCats: {}
    },
    lifecycle: {},
    commandReceipts: [],
    events: [],
    nextEventSequence: 1,
    ...overrides
  };
}
