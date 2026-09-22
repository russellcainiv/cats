// src/domain/building/types.ts
// Core domain interfaces and types for the Cats Building Subsystem

import type { LotId, ObjectId, WorldLot, LotObject, WallSegment, DoorItem, WindowItem, FloorFinishSegment } from '../../work/building/harness';

export type FurnitureCategory = 'seating' | 'sleep' | 'care' | 'play' | 'skill' | 'storage' | 'decor' | 'construction';

export interface CatalogItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  cost: number;
  width: number; // in grid cells
  height: number; // in grid cells
  colorVariants: string[];
  interactSpots: Array<{ x: number; y: number }>; // offset relative to top-left (0,0)
  requiresWall?: boolean;
  description: string;
}

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
  | { type: 'ENTER_FREE_BUILD'; payload: Record<string, never> }
  | { type: 'COMMIT_FREE_BUILD'; payload: Record<string, never> }
  | { type: 'CANCEL_FREE_BUILD'; payload: Record<string, never> };

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
