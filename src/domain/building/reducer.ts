// src/domain/building/reducer.ts
// Reducer and Tick Handler for Cats Building Subsystem

import {
  WorldState,
  WorldLot,
  LotObject,
  WallSegment,
  DoorItem,
  WindowItem,
  FloorFinishSegment,
  CommandContext,
  CommandResult,
  DomainEvent,
  CommandReceipt
} from '../../../work/building/harness';
import { BuildingCommand, BUILDING_COMMAND_TYPES } from './types';
import { getCatalogItem } from './catalog';
import {
  getObjectFootprint,
  getTransformedInteractSpots,
  isCellWithinLot,
  isCellBlockedByObject,
  validateLotReachability
} from './geometry';

export function isBuildingCommand(cmd: any): cmd is BuildingCommand {
  return cmd && typeof cmd.type === 'string' && BUILDING_COMMAND_TYPES.has(cmd.type);
}

export function initializeBuildingState() {
  return {
    lots: {},
    activeFreeBuild: false,
    undoStack: {}
  };
}

function pushUndoState(lot: WorldLot, undoStack?: Record<string, { past: WorldLot[]; future: WorldLot[] }>) {
  const lotStack = undoStack?.[lot.id] ?? { past: [], future: [] };
  const past = [...lotStack.past, JSON.parse(JSON.stringify(lot))];
  return {
    ...undoStack,
    [lot.id]: {
      past,
      future: [] // clear future on new action
    }
  };
}

export function reduceBuilding(
  state: WorldState,
  command: BuildingCommand,
  context: CommandContext
): CommandResult {
  // Idempotency check
  if (context.commandId) {
    const existingReceipt = state.commandReceipts.find(r => r.commandId === context.commandId);
    if (existingReceipt) {
      return { ok: true, state, events: [] };
    }
  }

  // Clone world state for pure mutation
  const nextState: WorldState = JSON.parse(JSON.stringify(state));
  const isFreeBuild = nextState.building.activeFreeBuild || nextState.economy.wallet.mode !== 'normal';
  const catsOnLot = Object.values(nextState.cats);

  const createReceipt = (success: boolean): CommandReceipt => ({
    commandId: context.commandId || `cmd_${Date.now()}_${Math.random()}`,
    simMinute: nextState.clock.simMinute,
    actorId: context.actorId || 'player',
    type: command.type,
    success,
    receiptChecksum: `chk_${Date.now()}`
  });

  const fail = (code: string, message: string): CommandResult => {
    return { ok: false, state, error: { code, message } };
  };

  switch (command.type) {
    case 'ENTER_FREE_BUILD': {
      if (nextState.building.activeFreeBuild) {
        return fail('ALREADY_IN_FREE_BUILD', 'Household is already in free-build mode.');
      }
      nextState.building.activeFreeBuild = true;
      nextState.economy.wallet.mode = 'free-build-preview';
      // Snapshot lot state for potential cancellation
      const activeLotId = nextState.neighborhood.activeLotId || 'lot_home';
      nextState.building.previewLot = JSON.parse(JSON.stringify(nextState.building.lots[activeLotId]));
      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'COMMIT_FREE_BUILD': {
      if (!nextState.building.activeFreeBuild) {
        return fail('NOT_IN_FREE_BUILD', 'Household is not in free-build mode.');
      }
      nextState.building.activeFreeBuild = false;
      nextState.economy.wallet.mode = 'normal';
      delete nextState.building.previewLot;
      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'CANCEL_FREE_BUILD': {
      if (!nextState.building.activeFreeBuild) {
        return fail('NOT_IN_FREE_BUILD', 'Household is not in free-build mode.');
      }
      const activeLotId = nextState.neighborhood.activeLotId || 'lot_home';
      if (nextState.building.previewLot) {
        nextState.building.lots[activeLotId] = JSON.parse(JSON.stringify(nextState.building.previewLot));
      }
      nextState.building.activeFreeBuild = false;
      nextState.economy.wallet.mode = 'normal';
      delete nextState.building.previewLot;
      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'BUY_AND_PLACE_OBJECT': {
      const { lotId, catalogId, x, y, rotation = 0, colorVariant } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const catalog = getCatalogItem(catalogId);
      if (!catalog) return fail('CATALOG_NOT_FOUND', `Catalog item ${catalogId} not found.`);

      const cost = isFreeBuild ? 0 : catalog.cost;
      if (!isFreeBuild && nextState.economy.wallet.earnedCash < cost) {
        return fail('INSUFFICIENT_FUNDS', `Insufficient cash. Requires $${cost}, has $${nextState.economy.wallet.earnedCash}.`);
      }

      // Check footprint bounds & overlap
      const footprint = getObjectFootprint(x, y, catalog.width, catalog.height, rotation);
      for (const cell of footprint) {
        if (!isCellWithinLot(cell, lot)) {
          return fail('OUT_OF_BOUNDS', `Object placement (${cell.x}, ${cell.y}) is out of lot bounds.`);
        }
        if (isCellBlockedByObject(cell.x, cell.y, lot)) {
          return fail('COLLISION', `Object placement overlaps another object at (${cell.x}, ${cell.y}).`);
        }
      }

      // Push current lot to undo stack
      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);

      // Debit cash
      if (!isFreeBuild) {
        nextState.economy.wallet.earnedCash -= cost;
      }

      const newObject: LotObject = {
        id: `obj_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        catalogId,
        name: catalog.name,
        category: catalog.category,
        x,
        y,
        width: catalog.width,
        height: catalog.height,
        rotation,
        colorVariant: colorVariant || catalog.colorVariants[0],
        interactSpots: catalog.interactSpots,
        provenance: isFreeBuild ? 'free_build' : 'earned'
      };

      lot.objects.push(newObject);

      // Validate reachability
      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Placement isolates cats or interact spots.');
      }

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'MOVE_OBJECT': {
      const { lotId, objectId, x, y, rotation } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const obj = lot.objects.find(o => o.id === objectId);
      if (!obj) return fail('OBJECT_NOT_FOUND', `Object ${objectId} not found on lot.`);

      const catalog = getCatalogItem(obj.catalogId);
      const baseW = catalog ? catalog.width : obj.width;
      const baseH = catalog ? catalog.height : obj.height;
      const rot = rotation ?? obj.rotation ?? 0;

      const footprint = getObjectFootprint(x, y, baseW, baseH, rot);
      for (const cell of footprint) {
        if (!isCellWithinLot(cell, lot)) {
          return fail('OUT_OF_BOUNDS', `Target location (${cell.x}, ${cell.y}) is out of bounds.`);
        }
        if (isCellBlockedByObject(cell.x, cell.y, lot, objectId)) {
          return fail('COLLISION', `Target location overlaps another object at (${cell.x}, ${cell.y}).`);
        }
      }

      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);

      obj.x = x;
      obj.y = y;
      obj.rotation = rot;

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Move blocks paths or isolates cats.');
      }

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'ROTATE_OBJECT': {
      const { lotId, objectId, rotation } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const obj = lot.objects.find(o => o.id === objectId);
      if (!obj) return fail('OBJECT_NOT_FOUND', `Object ${objectId} not found.`);

      const catalog = getCatalogItem(obj.catalogId);
      const baseW = catalog ? catalog.width : obj.width;
      const baseH = catalog ? catalog.height : obj.height;

      const footprint = getObjectFootprint(obj.x, obj.y, baseW, baseH, rotation);
      for (const cell of footprint) {
        if (!isCellWithinLot(cell, lot)) {
          return fail('OUT_OF_BOUNDS', `Rotated footprint is out of bounds.`);
        }
        if (isCellBlockedByObject(cell.x, cell.y, lot, objectId)) {
          return fail('COLLISION', `Rotated footprint collides with another object.`);
        }
      }

      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);
      obj.rotation = rotation;

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Rotation creates invalid layout.');
      }

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'RECOLOR_OBJECT': {
      const { lotId, objectId, colorVariant } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const obj = lot.objects.find(o => o.id === objectId);
      if (!obj) return fail('OBJECT_NOT_FOUND', `Object ${objectId} not found.`);

      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);
      obj.colorVariant = colorVariant;

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'SELL_OBJECT': {
      const { lotId, objectId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const index = lot.objects.findIndex(o => o.id === objectId);
      if (index === -1) return fail('OBJECT_NOT_FOUND', `Object ${objectId} not found.`);

      const obj = lot.objects[index];
      const catalog = getCatalogItem(obj.catalogId);

      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);

      // Provenance refund check:
      // Selling free_build object or selling while in freeBuild mode yields $0 refund!
      if (!isFreeBuild && obj.provenance === 'earned' && catalog) {
        nextState.economy.wallet.earnedCash += catalog.cost;
      }

      lot.objects.splice(index, 1);

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Selling object causes invalid layout.');
      }

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'BUILD_WALL': {
      const { lotId, x1, y1, x2, y2, finishId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const length = Math.abs(x2 - x1) + Math.abs(y2 - y1);
      const wallCostPerUnit = 20;
      const cost = isFreeBuild ? 0 : length * wallCostPerUnit;

      if (!isFreeBuild && nextState.economy.wallet.earnedCash < cost) {
        return fail('INSUFFICIENT_FUNDS', `Wall costs $${cost}, wallet has $${nextState.economy.wallet.earnedCash}.`);
      }

      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);

      if (!isFreeBuild) {
        nextState.economy.wallet.earnedCash -= cost;
      }

      const newWall: WallSegment = {
        id: `wall_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        x1, y1, x2, y2,
        provenance: isFreeBuild ? 'free_build' : 'earned',
        finishId
      };

      lot.walls.push(newWall);

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Wall blocks reachability or traps cat.');
      }

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'REMOVE_WALL': {
      const { lotId, wallId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const index = lot.walls.findIndex(w => w.id === wallId);
      if (index === -1) return fail('WALL_NOT_FOUND', `Wall ${wallId} not found.`);

      const wall = lot.walls[index];
      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);

      if (!isFreeBuild && wall.provenance === 'earned') {
        const length = Math.abs(wall.x2 - wall.x1) + Math.abs(wall.y2 - wall.y1);
        nextState.economy.wallet.earnedCash += length * 20;
      }

      lot.walls.splice(index, 1);

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Removing wall invalidates layout.');
      }

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'PLACE_DOOR': {
      const { lotId, x, y, orientation } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const cost = isFreeBuild ? 0 : 50;
      if (!isFreeBuild && nextState.economy.wallet.earnedCash < cost) {
        return fail('INSUFFICIENT_FUNDS', `Door costs $${cost}.`);
      }

      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);

      if (!isFreeBuild) {
        nextState.economy.wallet.earnedCash -= cost;
      }

      const newDoor: DoorItem = {
        id: `door_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        x, y, orientation,
        provenance: isFreeBuild ? 'free_build' : 'earned'
      };

      lot.doors.push(newDoor);

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Door placement creates invalid layout.');
      }

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'REMOVE_DOOR': {
      const { lotId, doorId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const index = lot.doors.findIndex(d => d.id === doorId);
      if (index === -1) return fail('DOOR_NOT_FOUND', `Door ${doorId} not found.`);

      const door = lot.doors[index];
      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);

      if (!isFreeBuild && door.provenance === 'earned') {
        nextState.economy.wallet.earnedCash += 50;
      }

      lot.doors.splice(index, 1);

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Removing door traps room or cat.');
      }

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'PLACE_WINDOW': {
      const { lotId, x, y, orientation } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      if (!lot.windows) lot.windows = [];

      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);

      const newWindow: WindowItem = {
        id: `win_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        x, y, orientation,
        provenance: isFreeBuild ? 'free_build' : 'earned'
      };

      lot.windows.push(newWindow);
      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'REMOVE_WINDOW': {
      const { lotId, windowId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot || !lot.windows) return fail('WINDOW_NOT_FOUND', `Window ${windowId} not found.`);

      const index = lot.windows.findIndex(w => w.id === windowId);
      if (index === -1) return fail('WINDOW_NOT_FOUND', `Window ${windowId} not found.`);

      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);
      lot.windows.splice(index, 1);

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'SET_FLOOR_FINISH': {
      const { lotId, x, y, width, height, finishId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      if (!lot.floorFinishes) lot.floorFinishes = [];
      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);

      const newFinish: FloorFinishSegment = {
        id: `flr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        x, y, width, height, finishId,
        provenance: isFreeBuild ? 'free_build' : 'earned'
      };

      lot.floorFinishes.push(newFinish);
      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'SET_WALL_FINISH': {
      const { lotId, wallId, finishId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const wall = lot.walls.find(w => w.id === wallId);
      if (!wall) return fail('WALL_NOT_FOUND', `Wall ${wallId} not found.`);

      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);
      wall.finishId = finishId;

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'DEMOLISH_ROOM': {
      const { lotId, bounds } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      nextState.building.undoStack = pushUndoState(lot, nextState.building.undoStack);

      // Refund objects and wall segments within bounds if provenance is earned
      let totalRefund = 0;

      lot.objects = lot.objects.filter(obj => {
        const inBounds = obj.x >= bounds.minX && obj.x <= bounds.maxX && obj.y >= bounds.minY && obj.y <= bounds.maxY;
        if (inBounds) {
          if (!isFreeBuild && obj.provenance === 'earned') {
            const cat = getCatalogItem(obj.catalogId);
            if (cat) totalRefund += cat.cost;
          }
          return false;
        }
        return true;
      });

      lot.walls = lot.walls.filter(w => {
        const inBounds = w.x1 >= bounds.minX && w.x2 <= bounds.maxX && w.y1 >= bounds.minY && w.y2 <= bounds.maxY;
        if (inBounds) {
          if (!isFreeBuild && w.provenance === 'earned') {
            const len = Math.abs(w.x2 - w.x1) + Math.abs(w.y2 - w.y1);
            totalRefund += len * 20;
          }
          return false;
        }
        return true;
      });

      if (!isFreeBuild) {
        nextState.economy.wallet.earnedCash += totalRefund;
      }

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Demolition invalidates reachability.');
      }

      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'UNDO_BUILD_ACTION': {
      const { lotId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const lotStack = nextState.building.undoStack?.[lotId];
      if (!lotStack || lotStack.past.length === 0) {
        return fail('NOTHING_TO_UNDO', 'No actions to undo in this build session.');
      }

      const previousLotState = lotStack.past.pop()!;
      lotStack.future.push(JSON.parse(JSON.stringify(lot)));

      nextState.building.lots[lotId] = previousLotState;
      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    case 'REDO_BUILD_ACTION': {
      const { lotId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const lotStack = nextState.building.undoStack?.[lotId];
      if (!lotStack || lotStack.future.length === 0) {
        return fail('NOTHING_TO_REDO', 'No actions to redo in this build session.');
      }

      const nextLotState = lotStack.future.pop()!;
      lotStack.past.push(JSON.parse(JSON.stringify(lot)));

      nextState.building.lots[lotId] = nextLotState;
      nextState.commandReceipts.push(createReceipt(true));
      return { ok: true, state: nextState, events: [] };
    }

    default:
      return fail('UNKNOWN_COMMAND', `Command type is unknown to building reducer.`);
  }
}

export function advanceBuilding(state: WorldState, elapsedSimMinutes: number): WorldState {
  if (elapsedSimMinutes <= 0) return state;

  const nextState: WorldState = JSON.parse(JSON.stringify(state));
  nextState.clock.simMinute += elapsedSimMinutes;

  // Invalidate undo stack across simulation epoch advancement to prevent undo across live simulation ticks!
  if (nextState.building.undoStack) {
    nextState.building.undoStack = {};
  }

  nextState.building.lastBuildSessionSimMinute = nextState.clock.simMinute;
  return nextState;
}
