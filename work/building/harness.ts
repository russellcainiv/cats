// work/building/harness.ts
// Synthetic scaffolding and harness types for Building Subsystem development & tests
// Strictly matching work/orchestrator/shared-engine-contract.md

export type CatId = string;
export type LotId = string;
export type ObjectId = string;
export type HouseholdId = string;
export type EventId = string;

export interface GridCell {
  x: number;
  y: number;
}

export interface CatPosition {
  lotId: LotId;
  x: number;
  y: number;
  roomIndex?: number;
}

export interface CatRecord {
  id: CatId;
  name: string;
  position: CatPosition;
  isGhost?: boolean;
}

export interface LotObject {
  id: ObjectId;
  catalogId: string;
  name: string;
  category: 'seating' | 'sleep' | 'care' | 'play' | 'skill' | 'storage' | 'decor' | 'construction';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: 0 | 90 | 180 | 270;
  colorVariant?: string;
  interactSpots: GridCell[];
  provenance: 'earned' | 'free_build';
}

export interface WallSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  provenance: 'earned' | 'free_build';
  finishId?: string;
}

export interface DoorItem {
  id: string;
  x: number;
  y: number;
  orientation: 'horizontal' | 'vertical';
  provenance: 'earned' | 'free_build';
}

export interface WindowItem {
  id: string;
  x: number;
  y: number;
  orientation: 'horizontal' | 'vertical';
  provenance: 'earned' | 'free_build';
}

export interface FloorFinishSegment {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  finishId: string;
  provenance: 'earned' | 'free_build';
}

export interface WorldLot {
  id: LotId;
  type: 'home' | 'npc_home' | 'park' | 'shop' | 'cafe';
  name: string;
  width: number;
  height: number;
  blockedCells: string[]; // "x,y" format
  walls: WallSegment[];
  doors: DoorItem[];
  windows?: WindowItem[];
  floorFinishes?: FloorFinishSegment[];
  objects: LotObject[];
}

export interface Wallet {
  earnedCash: number;
  freeBuildCash: number;
  mode: 'normal' | 'free-build-preview' | 'free-build-committed';
}

export interface InventoryItem {
  id: string;
  catalogId: string;
  quantity: number;
  provenance: 'earned' | 'free_build';
}

export interface SimClock {
  simMinute: number;
  isPaused: boolean;
  speed: 1;
}

export interface RngStateData {
  seed: number;
  counter: number;
  serializedState: string;
}

export interface CommandReceipt {
  commandId: string;
  simMinute: number;
  actorId: string;
  type: string;
  success: boolean;
  receiptChecksum: string;
}

export interface DomainEvent {
  id: EventId;
  type: string;
  sequence: number;
  simTime: number;
  actorIds: string[];
  payload: Record<string, unknown>;
  rngLabel?: string;
}

// Building Extension State
export interface UndoRedoStack {
  past: WorldLot[];
  future: WorldLot[];
}

export interface BuildingSubsystemState {
  lots: Record<LotId, WorldLot>;
  activeFreeBuild: boolean;
  previewLot?: WorldLot; // Snapshot during free-build or pending session
  undoStack?: Record<LotId, UndoRedoStack>;
  lastBuildSessionSimMinute?: number;
}

export interface WorldState {
  schemaVersion: number;
  catalogVersion: number;
  householdId: HouseholdId;
  householdName: string;
  ownerId: string;
  revision: number;
  clock: SimClock;
  rng: RngStateData;
  selectedCatId: CatId | null;
  livingCatIds: CatId[];
  cats: Record<CatId, CatRecord>;
  building: BuildingSubsystemState;
  social: any;
  economy: {
    wallet: Wallet;
    inventory: Record<string, InventoryItem>;
    careers: Record<string, any>;
    cafe: any;
    goals: Record<string, any>;
  };
  neighborhood: {
    activeLotId: LotId;
    npcCats: Record<CatId, CatRecord>;
  };
  lifecycle: any;
  commandReceipts: CommandReceipt[];
  events: DomainEvent[];
  nextEventSequence: number;
}

export interface CommandContext {
  actorId: string;
  commandId: string;
  timestamp?: number;
}

export type CommandResult =
  | { ok: true; state: WorldState; events: DomainEvent[] }
  | { ok: false; state: WorldState; error: { code: string; message: string } };

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
