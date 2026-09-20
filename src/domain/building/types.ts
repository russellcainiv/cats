// src/domain/building/types.ts
// Core domain interfaces and types for the Cats Building Subsystem
// Strictly aligned with canonical engine core schema and parallel-contract.md

export type CatId = string;
export type LotId = string;
export type ObjectId = string;
export type HouseholdId = string;
export type EventId = string;
export type CommandId = string;

export type FurnitureCategory =
  | 'seating'
  | 'sleep'
  | 'care'
  | 'play'
  | 'skill'
  | 'storage'
  | 'decor'
  | 'construction';

export interface GridCell {
  x: number;
  y: number;
}

export interface CatPosition {
  lotId: LotId;
  x: number;
  y: number;
  facing?: 'north' | 'south' | 'east' | 'west';
  roomIndex?: number;
}

export interface CatRecord {
  id: CatId;
  name: string;
  position: CatPosition;
  [key: string]: unknown;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  cost: number;
  width: number; // in grid cells
  height: number; // in grid cells
  colorVariants: string[];
  interactSpots: GridCell[]; // offset relative to top-left (0,0)
  requiresWall?: boolean;
  description: string;
}

export interface LotObject {
  id: ObjectId;
  catalogId: string;
  name: string;
  category: FurnitureCategory;
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
  blockedCells: string[]; // Set of "x,y" string keys
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
  fractionalMinutes?: number;
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

// Bounded atomic undo/redo history entry preserving both lot geometry and wallet balance
export interface UndoRedoEntry {
  lot: WorldLot;
  wallet: Wallet;
}

export interface UndoRedoStack {
  past: UndoRedoEntry[];
  future: UndoRedoEntry[];
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
  social: Record<string, unknown>;
  economy: {
    wallet: Wallet;
    inventory: Record<string, InventoryItem>;
    careers: Record<string, unknown>;
    cafe: unknown;
    goals: Record<string, unknown>;
  };
  neighborhood: {
    activeLotId: LotId;
    npcCats: Record<CatId, CatRecord>;
  };
  lifecycle: unknown;
  commandReceipts: CommandReceipt[];
  events: DomainEvent[];
  nextEventSequence: number;
}

export interface CommandContext {
  actorId: string;
  commandId: string;
  timestamp?: number;
}

export interface CommandResultSuccess {
  ok: true;
  state: WorldState;
  events: DomainEvent[];
}

export interface CommandResultFailure {
  ok: false;
  state: WorldState;
  error: { code: string; message: string };
}

export type CommandResult = CommandResultSuccess | CommandResultFailure;

export type BuildingCommand =
  | { type: 'BUY_AND_PLACE_OBJECT'; payload: { lotId: LotId; catalogId: string; x: number; y: number; rotation?: 0 | 90 | 180 | 270; colorVariant?: string } }
  | { type: 'MOVE_OBJECT'; payload: { lotId: LotId; objectId: ObjectId; x: number; y: number; rotation?: 0 | 90 | 180 | 270 } }
  | { type: 'ROTATE_OBJECT'; payload: { lotId: LotId; objectId: ObjectId; rotation: 0 | 90 | 180 | 270 } }
  | { type: 'RECOLOR_OBJECT'; payload: { lotId: LotId; objectId: ObjectId; colorVariant: string } }
  | { type: 'SELL_OBJECT'; payload: { lotId: LotId; objectId: ObjectId } }
  | { type: 'BUILD_WALL'; payload: { lotId: LotId; x1: number; y1: number; x2: number; y2: number; finishId?: string } }
  | { type: 'REMOVE_WALL'; payload: { lotId: LotId; wallId: string } }
  | { type: 'PLACE_DOOR'; payload: { lotId: LotId; x: number; y: number; orientation: 'horizontal' | 'vertical' } }
  | { type: 'REMOVE_DOOR'; payload: { lotId: LotId; doorId: string } }
  | { type: 'PLACE_WINDOW'; payload: { lotId: LotId; x: number; y: number; orientation: 'horizontal' | 'vertical' } }
  | { type: 'REMOVE_WINDOW'; payload: { lotId: LotId; windowId: string } }
  | { type: 'SET_FLOOR_FINISH'; payload: { lotId: LotId; x: number; y: number; width: number; height: number; finishId: string } }
  | { type: 'SET_WALL_FINISH'; payload: { lotId: LotId; wallId: string; finishId: string } }
  | { type: 'DEMOLISH_ROOM'; payload: { lotId: LotId; bounds: { minX: number; minY: number; maxX: number; maxY: number } } }
  | { type: 'UNDO_BUILD_ACTION'; payload: { lotId: LotId } }
  | { type: 'REDO_BUILD_ACTION'; payload: { lotId: LotId } }
  | { type: 'ENTER_FREE_BUILD'; payload?: Record<string, never> }
  | { type: 'COMMIT_FREE_BUILD'; payload?: Record<string, never> }
  | { type: 'CANCEL_FREE_BUILD'; payload?: Record<string, never> };

export const BUILDING_COMMAND_TYPES = new Set([
  'BUY_AND_PLACE_OBJECT',
  'MOVE_OBJECT',
  'ROTATE_OBJECT',
  'RECOLOR_OBJECT',
  'SELL_OBJECT',
  'BUILD_WALL',
  'REMOVE_WALL',
  'PLACE_DOOR',
  'REMOVE_DOOR',
  'PLACE_WINDOW',
  'REMOVE_WINDOW',
  'SET_FLOOR_FINISH',
  'SET_WALL_FINISH',
  'DEMOLISH_ROOM',
  'UNDO_BUILD_ACTION',
  'REDO_BUILD_ACTION',
  'ENTER_FREE_BUILD',
  'COMMIT_FREE_BUILD',
  'CANCEL_FREE_BUILD'
]);
