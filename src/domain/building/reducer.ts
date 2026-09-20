// src/domain/building/reducer.ts
// Reducer and Tick Handler for Cats Building Subsystem
// Conforming to parallel-contract.md and canonical engine standards

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
  CommandReceipt,
  BuildingCommand,
  BUILDING_COMMAND_TYPES,
  UndoRedoEntry,
  UndoRedoStack,
  Wallet
} from './types';
import { getCatalogItem } from './catalog';
import {
  getObjectFootprint,
  isCellWithinLot,
  isCellBlockedByObject,
  isEdgeOnWall,
  isCatIntersectingWall,
  validateLotReachability
} from './geometry';

const MAX_UNDO_DEPTH = 30;

export function isBuildingCommand(cmd: unknown): cmd is BuildingCommand {
  return (
    typeof cmd === 'object' &&
    cmd !== null &&
    'type' in cmd &&
    typeof (cmd as { type: unknown }).type === 'string' &&
    BUILDING_COMMAND_TYPES.has((cmd as { type: string }).type)
  );
}

export function initializeBuildingState() {
  return {
    lots: {},
    activeFreeBuild: false,
    undoStack: {}
  };
}

function computeReceiptChecksum(payload: unknown): string {
  const payloadStr = JSON.stringify(payload ?? {});
  let hashNum = 0;
  for (let i = 0; i < payloadStr.length; i++) {
    hashNum = (Math.imul(31, hashNum) + payloadStr.charCodeAt(i)) | 0;
  }
  return `chk_${(hashNum >>> 0).toString(16)}`;
}

function pushUndoState(
  lot: WorldLot,
  wallet: Wallet,
  undoStack?: Record<string, UndoRedoStack>
): Record<string, UndoRedoStack> {
  const lotStack = undoStack?.[lot.id] ?? { past: [], future: [] };
  const past: UndoRedoEntry[] = [
    ...lotStack.past,
    {
      lot: JSON.parse(JSON.stringify(lot)),
      wallet: JSON.parse(JSON.stringify(wallet))
    }
  ];

  // Enforce bounded undo history depth
  if (past.length > MAX_UNDO_DEPTH) {
    past.splice(0, past.length - MAX_UNDO_DEPTH);
  }

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
  // Idempotency check: return existing result without re-executing
  if (context.commandId) {
    const existingReceipt = state.commandReceipts.find(r => r.commandId === context.commandId);
    if (existingReceipt) {
      if (existingReceipt.success) {
        return { ok: true, state, events: [] };
      } else {
        return {
          ok: false,
          state,
          error: { code: 'DUPLICATE_COMMAND_FAILED', message: 'Command previously failed.' }
        };
      }
    }
  }

  // Clone world state for pure immutable modification
  const nextState: WorldState = JSON.parse(JSON.stringify(state));
  const isFreeBuild = nextState.building.activeFreeBuild || nextState.economy.wallet.mode !== 'normal';
  const catsOnLot = Object.values(nextState.cats);

  const getNextSeq = (): number => {
    const seq = nextState.nextEventSequence || 1;
    nextState.nextEventSequence = seq + 1;
    return seq;
  };

  const createReceipt = (success: boolean): CommandReceipt => ({
    commandId: context.commandId || `cmd_${nextState.clock.simMinute}_${getNextSeq()}`,
    simMinute: nextState.clock.simMinute,
    actorId: context.actorId || 'player',
    type: command.type,
    success,
    receiptChecksum: computeReceiptChecksum(command.payload)
  });

  const makeEvent = (type: string, payload: Record<string, unknown>, seq: number): DomainEvent => ({
    id: `evt_${nextState.clock.simMinute}_${seq}`,
    type,
    sequence: seq,
    simTime: nextState.clock.simMinute,
    actorIds: [context.actorId || 'player'],
    payload
  });

  const fail = (code: string, message: string): CommandResult => {
    // Return original input state completely untouched on failure
    return { ok: false, state, error: { code, message } };
  };

  const events: DomainEvent[] = [];

  switch (command.type) {
    case 'ENTER_FREE_BUILD': {
      if (nextState.building.activeFreeBuild) {
        return fail('ALREADY_IN_FREE_BUILD', 'Household is already in free-build mode.');
      }
      nextState.building.activeFreeBuild = true;
      nextState.economy.wallet.mode = 'free-build-preview';
      const activeLotId = nextState.neighborhood.activeLotId || 'lot_home';
      if (nextState.building.lots[activeLotId]) {
        nextState.building.previewLot = JSON.parse(JSON.stringify(nextState.building.lots[activeLotId]));
      }

      const seq = getNextSeq();
      const evt = makeEvent('FREE_BUILD_ENTERED', {}, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'COMMIT_FREE_BUILD': {
      if (!nextState.building.activeFreeBuild) {
        return fail('NOT_IN_FREE_BUILD', 'Household is not in free-build mode.');
      }
      nextState.building.activeFreeBuild = false;
      nextState.economy.wallet.mode = 'normal';
      delete nextState.building.previewLot;

      const seq = getNextSeq();
      const evt = makeEvent('FREE_BUILD_COMMITTED', {}, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'CANCEL_FREE_BUILD': {
      if (!nextState.building.activeFreeBuild) {
        return fail('NOT_IN_FREE_BUILD', 'Household is not in free-build mode.');
      }
      const activeLotId = nextState.neighborhood.activeLotId || 'lot_home';
      if (nextState.building.previewLot) {
        nextState.building.lots[activeLotId] = JSON.parse(JSON.stringify(nextState.building.previewLot));
      } else {
        // Revert any free_build provenance items on all lots
        for (const lot of Object.values(nextState.building.lots)) {
          lot.walls = lot.walls.filter(w => w.provenance !== 'free_build');
          lot.doors = lot.doors.filter(d => d.provenance !== 'free_build');
          if (lot.windows) lot.windows = lot.windows.filter(w => w.provenance !== 'free_build');
          if (lot.floorFinishes) lot.floorFinishes = lot.floorFinishes.filter(f => f.provenance !== 'free_build');
          lot.objects = lot.objects.filter(o => o.provenance !== 'free_build');
        }
      }
      nextState.building.activeFreeBuild = false;
      nextState.economy.wallet.mode = 'normal';
      delete nextState.building.previewLot;

      const seq = getNextSeq();
      const evt = makeEvent('FREE_BUILD_CANCELLED', {}, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'BUY_AND_PLACE_OBJECT': {
      const { lotId, catalogId, x, y, rotation = 0, colorVariant } = command.payload;
      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isInteger(x) || !Number.isInteger(y)) {
        return fail('INVALID_COORDINATES', 'Object coordinates must be finite integers.');
      }

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

      // Snapshot lot and wallet together for atomic undo/redo
      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      if (!isFreeBuild) {
        nextState.economy.wallet.earnedCash -= cost;
      }

      const seq = getNextSeq();
      const objId = `obj_${catalogId}_${x}_${y}_${seq}`;
      const newObject: LotObject = {
        id: objId,
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

      const evt = makeEvent('OBJECT_PLACED', { lotId, objectId: objId, catalogId, x, y, rotation, cost }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'MOVE_OBJECT': {
      const { lotId, objectId, x, y, rotation } = command.payload;
      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isInteger(x) || !Number.isInteger(y)) {
        return fail('INVALID_COORDINATES', 'Object coordinates must be finite integers.');
      }

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

      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      obj.x = x;
      obj.y = y;
      obj.rotation = rot;

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Move blocks paths or isolates cats.');
      }

      const seq = getNextSeq();
      const evt = makeEvent('OBJECT_MOVED', { lotId, objectId, x, y, rotation: rot }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
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
          return fail('OUT_OF_BOUNDS', 'Rotated footprint is out of bounds.');
        }
        if (isCellBlockedByObject(cell.x, cell.y, lot, objectId)) {
          return fail('COLLISION', 'Rotated footprint collides with another object.');
        }
      }

      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);
      obj.rotation = rotation;

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Rotation creates invalid layout.');
      }

      const seq = getNextSeq();
      const evt = makeEvent('OBJECT_ROTATED', { lotId, objectId, rotation }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'RECOLOR_OBJECT': {
      const { lotId, objectId, colorVariant } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const obj = lot.objects.find(o => o.id === objectId);
      if (!obj) return fail('OBJECT_NOT_FOUND', `Object ${objectId} not found.`);

      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);
      obj.colorVariant = colorVariant;

      const seq = getNextSeq();
      const evt = makeEvent('OBJECT_RECOLORED', { lotId, objectId, colorVariant }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'SELL_OBJECT': {
      const { lotId, objectId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const index = lot.objects.findIndex(o => o.id === objectId);
      if (index === -1) return fail('OBJECT_NOT_FOUND', `Object ${objectId} not found.`);

      const obj = lot.objects[index];
      const catalog = getCatalogItem(obj.catalogId);

      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      let refundAmount = 0;
      if (!isFreeBuild && obj.provenance === 'earned' && catalog) {
        refundAmount = catalog.cost;
        nextState.economy.wallet.earnedCash += refundAmount;
      }

      lot.objects.splice(index, 1);

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Selling object causes invalid layout.');
      }

      const seq = getNextSeq();
      const evt = makeEvent('OBJECT_SOLD', { lotId, objectId, catalogId: obj.catalogId, refundAmount }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'BUILD_WALL': {
      const { lotId, x1, y1, x2, y2, finishId } = command.payload;
      // Coordinate sanitization: finite integers
      if (
        typeof x1 !== 'number' || typeof y1 !== 'number' ||
        typeof x2 !== 'number' || typeof y2 !== 'number' ||
        !Number.isInteger(x1) || !Number.isInteger(y1) ||
        !Number.isInteger(x2) || !Number.isInteger(y2)
      ) {
        return fail('INVALID_COORDINATES', 'Wall coordinates must be finite integers.');
      }

      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      // Bounds validation
      if (
        x1 < 0 || x1 > lot.width ||
        x2 < 0 || x2 > lot.width ||
        y1 < 0 || y1 > lot.height ||
        y2 < 0 || y2 > lot.height
      ) {
        return fail('OUT_OF_BOUNDS', 'Wall coordinates exceed lot bounds.');
      }

      // Orthogonal alignment validation: strictly horizontal or vertical
      if (x1 !== x2 && y1 !== y2) {
        return fail('INVALID_WALL_GEOMETRY', 'Walls must be strictly horizontal or vertical.');
      }

      // Zero-length check
      if (x1 === x2 && y1 === y2) {
        return fail('INVALID_WALL_GEOMETRY', 'Wall length must be greater than zero.');
      }

      // Direct wall-on-cat collision rejection
      const candidateWall: WallSegment = {
        id: 'candidate',
        x1, y1, x2, y2,
        provenance: 'earned'
      };
      for (const cat of catsOnLot) {
        if (cat.position.lotId !== lotId) continue;
        if (isCatIntersectingWall(cat.position.x, cat.position.y, candidateWall)) {
          return fail('INVALID_LAYOUT', `Cannot build wall directly on cat ${cat.name} at (${cat.position.x}, ${cat.position.y}).`);
        }
      }

      const length = Math.abs(x2 - x1) + Math.abs(y2 - y1);
      const wallCostPerUnit = 20;
      const cost = isFreeBuild ? 0 : length * wallCostPerUnit;

      if (!isFreeBuild && nextState.economy.wallet.earnedCash < cost) {
        return fail('INSUFFICIENT_FUNDS', `Wall costs $${cost}, wallet has $${nextState.economy.wallet.earnedCash}.`);
      }

      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      if (!isFreeBuild) {
        nextState.economy.wallet.earnedCash -= cost;
      }

      const seq = getNextSeq();
      const wallId = `wall_${lotId}_${x1}_${y1}_${x2}_${y2}_${seq}`;
      const newWall: WallSegment = {
        id: wallId,
        x1, y1, x2, y2,
        provenance: isFreeBuild ? 'free_build' : 'earned',
        finishId
      };

      lot.walls.push(newWall);

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Wall blocks reachability or traps cat.');
      }

      const evt = makeEvent('WALL_BUILT', { lotId, wallId, x1, y1, x2, y2, cost }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'REMOVE_WALL': {
      const { lotId, wallId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const index = lot.walls.findIndex(w => w.id === wallId);
      if (index === -1) return fail('WALL_NOT_FOUND', `Wall ${wallId} not found.`);

      const wall = lot.walls[index];
      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      if (!isFreeBuild && wall.provenance === 'earned') {
        const length = Math.abs(wall.x2 - wall.x1) + Math.abs(wall.y2 - wall.y1);
        nextState.economy.wallet.earnedCash += length * 20;
      }

      lot.walls.splice(index, 1);

      // Clean up orphaned doors and windows that no longer have a supporting wall
      lot.doors = lot.doors.filter(d => isEdgeOnWall(d.x, d.y, d.orientation, lot.walls));
      if (lot.windows) {
        lot.windows = lot.windows.filter(w => isEdgeOnWall(w.x, w.y, w.orientation, lot.walls));
      }

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Removing wall invalidates layout.');
      }

      const seq = getNextSeq();
      const evt = makeEvent('WALL_REMOVED', { lotId, wallId }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'PLACE_DOOR': {
      const { lotId, x, y, orientation } = command.payload;
      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isInteger(x) || !Number.isInteger(y)) {
        return fail('INVALID_COORDINATES', 'Door coordinates must be finite integers.');
      }

      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      // Door must be placed on an existing wall segment
      if (!isEdgeOnWall(x, y, orientation, lot.walls)) {
        return fail('MISSING_WALL', 'Door must be placed on an existing wall.');
      }

      // Check for collision with existing door or window on the same edge
      if (lot.doors.some(d => d.x === x && d.y === y && d.orientation === orientation)) {
        return fail('COLLISION', 'A door already exists at this location.');
      }
      if (lot.windows?.some(w => w.x === x && w.y === y && w.orientation === orientation)) {
        return fail('COLLISION', 'A window already exists at this location.');
      }

      const cost = isFreeBuild ? 0 : 50;
      if (!isFreeBuild && nextState.economy.wallet.earnedCash < cost) {
        return fail('INSUFFICIENT_FUNDS', `Door costs $${cost}.`);
      }

      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      if (!isFreeBuild) {
        nextState.economy.wallet.earnedCash -= cost;
      }

      const seq = getNextSeq();
      const doorId = `door_${lotId}_${x}_${y}_${seq}`;
      const newDoor: DoorItem = {
        id: doorId,
        x, y, orientation,
        provenance: isFreeBuild ? 'free_build' : 'earned'
      };

      lot.doors.push(newDoor);

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Door placement creates invalid layout.');
      }

      const evt = makeEvent('DOOR_PLACED', { lotId, doorId, x, y, orientation, cost }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'REMOVE_DOOR': {
      const { lotId, doorId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const index = lot.doors.findIndex(d => d.id === doorId);
      if (index === -1) return fail('DOOR_NOT_FOUND', `Door ${doorId} not found.`);

      const door = lot.doors[index];
      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      if (!isFreeBuild && door.provenance === 'earned') {
        nextState.economy.wallet.earnedCash += 50;
      }

      lot.doors.splice(index, 1);

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Removing door traps room or cat.');
      }

      const seq = getNextSeq();
      const evt = makeEvent('DOOR_REMOVED', { lotId, doorId }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'PLACE_WINDOW': {
      const { lotId, x, y, orientation } = command.payload;
      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isInteger(x) || !Number.isInteger(y)) {
        return fail('INVALID_COORDINATES', 'Window coordinates must be finite integers.');
      }

      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      // Window must be placed on an existing wall segment
      if (!isEdgeOnWall(x, y, orientation, lot.walls)) {
        return fail('MISSING_WALL', 'Window must be placed on an existing wall.');
      }

      if (!lot.windows) lot.windows = [];

      // Check collision
      if (lot.doors.some(d => d.x === x && d.y === y && d.orientation === orientation)) {
        return fail('COLLISION', 'A door already exists at this location.');
      }
      if (lot.windows.some(w => w.x === x && w.y === y && w.orientation === orientation)) {
        return fail('COLLISION', 'A window already exists at this location.');
      }

      const cost = isFreeBuild ? 0 : 40;
      if (!isFreeBuild && nextState.economy.wallet.earnedCash < cost) {
        return fail('INSUFFICIENT_FUNDS', `Window costs $${cost}.`);
      }

      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      if (!isFreeBuild) {
        nextState.economy.wallet.earnedCash -= cost;
      }

      const seq = getNextSeq();
      const windowId = `win_${lotId}_${x}_${y}_${seq}`;
      const newWindow: WindowItem = {
        id: windowId,
        x, y, orientation,
        provenance: isFreeBuild ? 'free_build' : 'earned'
      };

      lot.windows.push(newWindow);

      const evt = makeEvent('WINDOW_PLACED', { lotId, windowId, x, y, orientation, cost }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'REMOVE_WINDOW': {
      const { lotId, windowId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot || !lot.windows) return fail('WINDOW_NOT_FOUND', `Window ${windowId} not found.`);

      const index = lot.windows.findIndex(w => w.id === windowId);
      if (index === -1) return fail('WINDOW_NOT_FOUND', `Window ${windowId} not found.`);

      const win = lot.windows[index];
      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      if (!isFreeBuild && win.provenance === 'earned') {
        nextState.economy.wallet.earnedCash += 40;
      }

      lot.windows.splice(index, 1);

      const seq = getNextSeq();
      const evt = makeEvent('WINDOW_REMOVED', { lotId, windowId }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'SET_FLOOR_FINISH': {
      const { lotId, x, y, width, height, finishId } = command.payload;
      if (
        typeof x !== 'number' || typeof y !== 'number' ||
        typeof width !== 'number' || typeof height !== 'number' ||
        !Number.isInteger(x) || !Number.isInteger(y) ||
        !Number.isInteger(width) || !Number.isInteger(height) ||
        width <= 0 || height <= 0
      ) {
        return fail('INVALID_COORDINATES', 'Floor finish dimensions must be positive integers.');
      }

      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      if (x < 0 || x + width > lot.width || y < 0 || y + height > lot.height) {
        return fail('OUT_OF_BOUNDS', 'Floor finish area exceeds lot bounds.');
      }

      const cost = isFreeBuild ? 0 : width * height * 10;
      if (!isFreeBuild && nextState.economy.wallet.earnedCash < cost) {
        return fail('INSUFFICIENT_FUNDS', `Floor finish costs $${cost}.`);
      }

      if (!lot.floorFinishes) lot.floorFinishes = [];
      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      if (!isFreeBuild) {
        nextState.economy.wallet.earnedCash -= cost;
      }

      const seq = getNextSeq();
      const flrId = `flr_${lotId}_${x}_${y}_${seq}`;
      const newFinish: FloorFinishSegment = {
        id: flrId,
        x, y, width, height, finishId,
        provenance: isFreeBuild ? 'free_build' : 'earned'
      };

      lot.floorFinishes.push(newFinish);

      const evt = makeEvent('FLOOR_FINISH_SET', { lotId, finishId: flrId, x, y, width, height, cost }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'SET_WALL_FINISH': {
      const { lotId, wallId, finishId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const wall = lot.walls.find(w => w.id === wallId);
      if (!wall) return fail('WALL_NOT_FOUND', `Wall ${wallId} not found.`);

      const cost = isFreeBuild ? 0 : 15;
      if (!isFreeBuild && nextState.economy.wallet.earnedCash < cost) {
        return fail('INSUFFICIENT_FUNDS', `Wall finish costs $${cost}.`);
      }

      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      if (!isFreeBuild) {
        nextState.economy.wallet.earnedCash -= cost;
      }

      wall.finishId = finishId;

      const seq = getNextSeq();
      const evt = makeEvent('WALL_FINISH_SET', { lotId, wallId, finishId, cost }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'DEMOLISH_ROOM': {
      const { lotId, bounds } = command.payload;
      if (
        typeof bounds.minX !== 'number' || typeof bounds.minY !== 'number' ||
        typeof bounds.maxX !== 'number' || typeof bounds.maxY !== 'number' ||
        !Number.isInteger(bounds.minX) || !Number.isInteger(bounds.minY) ||
        !Number.isInteger(bounds.maxX) || !Number.isInteger(bounds.maxY) ||
        bounds.minX > bounds.maxX || bounds.minY > bounds.maxY
      ) {
        return fail('INVALID_COORDINATES', 'Demolition bounds must be valid integer boundaries.');
      }

      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      nextState.building.undoStack = pushUndoState(lot, nextState.economy.wallet, nextState.building.undoStack);

      let totalRefund = 0;

      // 1. Demolish objects within bounds
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

      // 2. Demolish walls within bounds
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

      // 3. Demolish doors within bounds
      lot.doors = lot.doors.filter(d => {
        const inBounds = d.x >= bounds.minX && d.x <= bounds.maxX && d.y >= bounds.minY && d.y <= bounds.maxY;
        if (inBounds) {
          if (!isFreeBuild && d.provenance === 'earned') {
            totalRefund += 50;
          }
          return false;
        }
        return true;
      });

      // 4. Demolish windows within bounds
      if (lot.windows) {
        lot.windows = lot.windows.filter(w => {
          const inBounds = w.x >= bounds.minX && w.x <= bounds.maxX && w.y >= bounds.minY && w.y <= bounds.maxY;
          if (inBounds) {
            if (!isFreeBuild && w.provenance === 'earned') {
              totalRefund += 40;
            }
            return false;
          }
          return true;
        } );
      }

      // 5. Demolish floor finishes overlapping bounds
      if (lot.floorFinishes) {
        lot.floorFinishes = lot.floorFinishes.filter(f => {
          const overlaps = (
            f.x < bounds.maxX && f.x + f.width > bounds.minX &&
            f.y < bounds.maxY && f.y + f.height > bounds.minY
          );
          if (overlaps) {
            if (!isFreeBuild && f.provenance === 'earned') {
              totalRefund += f.width * f.height * 10;
            }
            return false;
          }
          return true;
        });
      }

      // 6. Clean up any remaining doors/windows that were attached to walls now demolished
      lot.doors = lot.doors.filter(d => isEdgeOnWall(d.x, d.y, d.orientation, lot.walls));
      if (lot.windows) {
        lot.windows = lot.windows.filter(w => isEdgeOnWall(w.x, w.y, w.orientation, lot.walls));
      }

      if (!isFreeBuild) {
        nextState.economy.wallet.earnedCash += totalRefund;
      }

      const validation = validateLotReachability(lot, catsOnLot);
      if (!validation.valid) {
        return fail('INVALID_LAYOUT', validation.reason || 'Demolition invalidates reachability.');
      }

      const seq = getNextSeq();
      const evt = makeEvent('ROOM_DEMOLISHED', { lotId, bounds, totalRefund }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'UNDO_BUILD_ACTION': {
      const { lotId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const lotStack = nextState.building.undoStack?.[lotId];
      if (!lotStack || lotStack.past.length === 0) {
        return fail('NOTHING_TO_UNDO', 'No actions to undo in this build session.');
      }

      // Pop previous state snapshot (lot + wallet)
      const previousEntry = lotStack.past.pop()!;
      // Push current state snapshot to future
      lotStack.future.push({
        lot: JSON.parse(JSON.stringify(lot)),
        wallet: JSON.parse(JSON.stringify(nextState.economy.wallet))
      });

      // Atomically restore both lot geometry and wallet balance
      nextState.building.lots[lotId] = previousEntry.lot;
      nextState.economy.wallet = previousEntry.wallet;

      const seq = getNextSeq();
      const evt = makeEvent('BUILD_ACTION_UNDONE', { lotId }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    case 'REDO_BUILD_ACTION': {
      const { lotId } = command.payload;
      const lot = nextState.building.lots[lotId];
      if (!lot) return fail('LOT_NOT_FOUND', `Lot ${lotId} not found.`);

      const lotStack = nextState.building.undoStack?.[lotId];
      if (!lotStack || lotStack.future.length === 0) {
        return fail('NOTHING_TO_REDO', 'No actions to redo in this build session.');
      }

      // Pop next state snapshot (lot + wallet)
      const nextEntry = lotStack.future.pop()!;
      // Push current state snapshot to past
      lotStack.past.push({
        lot: JSON.parse(JSON.stringify(lot)),
        wallet: JSON.parse(JSON.stringify(nextState.economy.wallet))
      });

      // Atomically restore both lot geometry and wallet balance
      nextState.building.lots[lotId] = nextEntry.lot;
      nextState.economy.wallet = nextEntry.wallet;

      const seq = getNextSeq();
      const evt = makeEvent('BUILD_ACTION_REDONE', { lotId }, seq);
      events.push(evt);
      nextState.commandReceipts.push(createReceipt(true));
      nextState.events = [...(nextState.events || []), ...events].slice(-128);
      nextState.revision = (nextState.revision || 0) + 1;
      return { ok: true, state: nextState, events };
    }

    default:
      return fail('UNKNOWN_COMMAND', 'Command type is unknown to building reducer.');
  }
}

export function advanceBuilding(state: WorldState, elapsedSimMinutes: number): WorldState {
  if (typeof elapsedSimMinutes !== 'number' || !Number.isFinite(elapsedSimMinutes) || elapsedSimMinutes <= 0) {
    return state;
  }

  const nextState: WorldState = JSON.parse(JSON.stringify(state));

  // Invalidate undo stack across simulation tick boundary to prevent undoing across live simulation epochs!
  if (nextState.building.undoStack) {
    nextState.building.undoStack = {};
  }

  // Core owns the clock and simMinute progression; module advance receives end-of-step time
  // and must NOT increment clock a second time.
  nextState.building.lastBuildSessionSimMinute = nextState.clock.simMinute;
  return nextState;
}
