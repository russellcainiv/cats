// tests/domain/building/building.test.ts
// Comprehensive domain behavior tests for Tasks 07-10 (Issues 8-11) - Building Subsystem

import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialWorldState, WorldState, CommandContext } from '../../../work/building/harness';
import {
  reduceBuilding,
  advanceBuilding,
  FURNITURE_CATALOG,
  getCatalogItem,
  BuildingCommand
} from '../../../src/domain/building/index';

describe('Cats Building Subsystem (Tasks 07-10 / Issues 8-11)', () => {
  let initialState: WorldState;
  const ctx: CommandContext = { actorId: 'player_1', commandId: 'cmd_test_1' };

  beforeEach(() => {
    initialState = createInitialWorldState();
  });

  describe('Issue 07 - Furniture Catalog & Buy / Place / Move / Rotate / Recolor / Sell', () => {
    it('contains exactly 30 furniture & construction catalog items', () => {
      expect(FURNITURE_CATALOG.length).toBe(30);
      const ids = new Set(FURNITURE_CATALOG.map(item => item.id));
      expect(ids.size).toBe(30);
    });

    it('buys and places furniture, deducting earned cash', () => {
      const catalogItem = getCatalogItem('seat_cushion_sofa')!;
      const command: BuildingCommand = {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5, rotation: 0 }
      };

      const result = reduceBuilding(initialState, command, { ...ctx, commandId: 'c1' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.state.economy.wallet.earnedCash).toBe(1000 - catalogItem.cost);
      expect(result.state.building.lots.lot_home.objects.length).toBe(1);
      const placed = result.state.building.lots.lot_home.objects[0];
      expect(placed.catalogId).toBe('seat_cushion_sofa');
      expect(placed.provenance).toBe('earned');
    });

    it('rejects purchase if funds are insufficient and leaves state unchanged', () => {
      const poorState = createInitialWorldState();
      poorState.economy.wallet.earnedCash = 10; // Couch costs 250

      const command: BuildingCommand = {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      };

      const result = reduceBuilding(poorState, command, { ...ctx, commandId: 'c_poor' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INSUFFICIENT_FUNDS');
      }
      expect(poorState.economy.wallet.earnedCash).toBe(10);
      expect(poorState.building.lots.lot_home.objects.length).toBe(0);
    });

    it('moves, rotates, and recolors existing object', () => {
      // First place object
      const placeCmd: BuildingCommand = {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      };
      const res1 = reduceBuilding(initialState, placeCmd, { ...ctx, commandId: 'c_place' });
      expect(res1.ok).toBe(true);
      if (!res1.ok) return;

      const objId = res1.state.building.lots.lot_home.objects[0].id;

      // Move object
      const moveCmd: BuildingCommand = {
        type: 'MOVE_OBJECT',
        payload: { lotId: 'lot_home', objectId: objId, x: 8, y: 8 }
      };
      const res2 = reduceBuilding(res1.state, moveCmd, { ...ctx, commandId: 'c_move' });
      expect(res2.ok).toBe(true);
      if (!res2.ok) return;
      expect(res2.state.building.lots.lot_home.objects[0].x).toBe(8);

      // Rotate object
      const rotCmd: BuildingCommand = {
        type: 'ROTATE_OBJECT',
        payload: { lotId: 'lot_home', objectId: objId, rotation: 90 }
      };
      const res3 = reduceBuilding(res2.state, rotCmd, { ...ctx, commandId: 'c_rot' });
      expect(res3.ok).toBe(true);
      if (!res3.ok) return;
      expect(res3.state.building.lots.lot_home.objects[0].rotation).toBe(90);

      // Recolor object
      const recolorCmd: BuildingCommand = {
        type: 'RECOLOR_OBJECT',
        payload: { lotId: 'lot_home', objectId: objId, colorVariant: 'navy' }
      };
      const res4 = reduceBuilding(res3.state, recolorCmd, { ...ctx, commandId: 'c_recolor' });
      expect(res4.ok).toBe(true);
      if (!res4.ok) return;
      expect(res4.state.building.lots.lot_home.objects[0].colorVariant).toBe('navy');
    });

    it('sells object and refunds cost for earned provenance', () => {
      const placeCmd: BuildingCommand = {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      };
      const res1 = reduceBuilding(initialState, placeCmd, { ...ctx, commandId: 'c_place' });
      if (!res1.ok) return;

      const objId = res1.state.building.lots.lot_home.objects[0].id;
      const cashBeforeSell = res1.state.economy.wallet.earnedCash;

      const sellCmd: BuildingCommand = {
        type: 'SELL_OBJECT',
        payload: { lotId: 'lot_home', objectId: objId }
      };
      const res2 = reduceBuilding(res1.state, sellCmd, { ...ctx, commandId: 'c_sell' });
      expect(res2.ok).toBe(true);
      if (!res2.ok) return;

      expect(res2.state.building.lots.lot_home.objects.length).toBe(0);
      expect(res2.state.economy.wallet.earnedCash).toBe(cashBeforeSell + 250);
    });
  });

  describe('Issue 08 - Floor Plan, Walls, Doors, Windows & Finishes', () => {
    it('builds wall segment and deducts cost based on length', () => {
      const wallCmd: BuildingCommand = {
        type: 'BUILD_WALL',
        payload: { lotId: 'lot_home', x1: 5, y1: 5, x2: 10, y2: 5 } // length = 5, cost = 100
      };

      const res = reduceBuilding(initialState, wallCmd, { ...ctx, commandId: 'c_wall' });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.state.economy.wallet.earnedCash).toBe(1000 - 100);
      expect(res.state.building.lots.lot_home.walls.length).toBe(5); // initial 4 + 1
    });

    it('places door and window on lot', () => {
      const doorCmd: BuildingCommand = {
        type: 'PLACE_DOOR',
        payload: { lotId: 'lot_home', x: 5, y: 2, orientation: 'horizontal' }
      };

      const res1 = reduceBuilding(initialState, doorCmd, { ...ctx, commandId: 'c_door' });
      expect(res1.ok).toBe(true);
      if (!res1.ok) return;

      const winCmd: BuildingCommand = {
        type: 'PLACE_WINDOW',
        payload: { lotId: 'lot_home', x: 8, y: 2, orientation: 'horizontal' }
      };

      const res2 = reduceBuilding(res1.state, winCmd, { ...ctx, commandId: 'c_win' });
      expect(res2.ok).toBe(true);
      if (!res2.ok) return;

      expect(res2.state.building.lots.lot_home.doors.length).toBe(2);
      expect(res2.state.building.lots.lot_home.windows?.length).toBe(1);
    });

    it('sets floor finish and wall finish', () => {
      const floorCmd: BuildingCommand = {
        type: 'SET_FLOOR_FINISH',
        payload: { lotId: 'lot_home', x: 3, y: 3, width: 4, height: 4, finishId: 'oak_wood_plank' }
      };

      const res1 = reduceBuilding(initialState, floorCmd, { ...ctx, commandId: 'c_flr' });
      expect(res1.ok).toBe(true);
      if (!res1.ok) return;

      const wallId = res1.state.building.lots.lot_home.walls[0].id;
      const wallFinishCmd: BuildingCommand = {
        type: 'SET_WALL_FINISH',
        payload: { lotId: 'lot_home', wallId, finishId: 'pastel_yellow_paint' }
      };

      const res2 = reduceBuilding(res1.state, wallFinishCmd, { ...ctx, commandId: 'c_wall_fin' });
      expect(res2.ok).toBe(true);
      if (!res2.ok) return;

      expect(res2.state.building.lots.lot_home.floorFinishes?.length).toBe(1);
      expect(res2.state.building.lots.lot_home.walls[0].finishId).toBe('pastel_yellow_paint');
    });
  });

  describe('Issue 09 - Safe Edits, Demolition, Reachability Validation & Undo/Redo', () => {
    it('rejects wall placement that traps a cat inside an isolated un-doored room', () => {
      // Cat is at (10, 10). Create 4 surrounding walls without a door around (10,10)
      const w1: BuildingCommand = { type: 'BUILD_WALL', payload: { lotId: 'lot_home', x1: 9, y1: 9, x2: 11, y2: 9 } };
      const w2: BuildingCommand = { type: 'BUILD_WALL', payload: { lotId: 'lot_home', x1: 11, y1: 9, x2: 11, y2: 11 } };
      const w3: BuildingCommand = { type: 'BUILD_WALL', payload: { lotId: 'lot_home', x1: 11, y1: 11, x2: 9, y2: 11 } };
      const w4: BuildingCommand = { type: 'BUILD_WALL', payload: { lotId: 'lot_home', x1: 9, y1: 11, x2: 9, y2: 9 } };

      let s = reduceBuilding(initialState, w1, { ...ctx, commandId: 'w1' }).state!;
      s = reduceBuilding(s, w2, { ...ctx, commandId: 'w2' }).state!;
      s = reduceBuilding(s, w3, { ...ctx, commandId: 'w3' }).state!;

      // 4th wall traps Mochi at (10,10)
      const res4 = reduceBuilding(s, w4, { ...ctx, commandId: 'w4' });
      expect(res4.ok).toBe(false);
      if (!res4.ok) {
        expect(res4.error.code).toBe('INVALID_LAYOUT');
        expect(res4.error.message).toContain('trapped');
      }
    });

    it('demolishes a room area, deleting enclosed objects/walls and refunding earned items', () => {
      // Place sofa at (5,5)
      const placeCmd: BuildingCommand = {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      };
      const s1 = reduceBuilding(initialState, placeCmd, { ...ctx, commandId: 'c1' }).state!;
      const cashBeforeDemo = s1.economy.wallet.earnedCash;

      const demoCmd: BuildingCommand = {
        type: 'DEMOLISH_ROOM',
        payload: { lotId: 'lot_home', bounds: { minX: 4, minY: 4, maxX: 7, maxY: 7 } }
      };

      const resDemo = reduceBuilding(s1, demoCmd, { ...ctx, commandId: 'c_demo' });
      expect(resDemo.ok).toBe(true);
      if (!resDemo.ok) return;

      expect(resDemo.state.building.lots.lot_home.objects.length).toBe(0);
      expect(resDemo.state.economy.wallet.earnedCash).toBe(cashBeforeDemo + 250);
    });

    it('supports undo and redo within same build session', () => {
      const placeCmd: BuildingCommand = {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      };
      const s1 = reduceBuilding(initialState, placeCmd, { ...ctx, commandId: 'c1' }).state!;

      expect(s1.building.lots.lot_home.objects.length).toBe(1);

      // Undo
      const undoCmd: BuildingCommand = { type: 'UNDO_BUILD_ACTION', payload: { lotId: 'lot_home' } };
      const resUndo = reduceBuilding(s1, undoCmd, { ...ctx, commandId: 'c_undo' });
      expect(resUndo.ok).toBe(true);
      if (!resUndo.ok) return;

      expect(resUndo.state.building.lots.lot_home.objects.length).toBe(0);

      // Redo
      const redoCmd: BuildingCommand = { type: 'REDO_BUILD_ACTION', payload: { lotId: 'lot_home' } };
      const resRedo = reduceBuilding(resUndo.state, redoCmd, { ...ctx, commandId: 'c_redo' });
      expect(resRedo.ok).toBe(true);
      if (!resRedo.ok) return;

      expect(resRedo.state.building.lots.lot_home.objects.length).toBe(1);
    });

    it('invalidates undo stack when simulation advances a tick', () => {
      const placeCmd: BuildingCommand = {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      };
      const s1 = reduceBuilding(initialState, placeCmd, { ...ctx, commandId: 'c1' }).state!;

      // Advance sim tick
      const sTick = advanceBuilding(s1, 5);

      const undoCmd: BuildingCommand = { type: 'UNDO_BUILD_ACTION', payload: { lotId: 'lot_home' } };
      const resUndo = reduceBuilding(sTick, undoCmd, { ...ctx, commandId: 'c_undo_expired' });

      expect(resUndo.ok).toBe(false);
      if (!resUndo.ok) {
        expect(resUndo.error.code).toBe('NOTHING_TO_UNDO');
      }
    });
  });

  describe('Issue 10 - Free-Build, Provenance Anti-Exploit & Commit/Cancel', () => {
    it('enters free build mode and places free objects with $0 charge and free_build provenance', () => {
      const enterCmd: BuildingCommand = { type: 'ENTER_FREE_BUILD', payload: {} };
      const sFree = reduceBuilding(initialState, enterCmd, { ...ctx, commandId: 'c_enter' }).state!;

      expect(sFree.building.activeFreeBuild).toBe(true);
      expect(sFree.economy.wallet.mode).toBe('free-build-preview');

      // Buy expensive queen bed ($600)
      const buyBedCmd: BuildingCommand = {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'sleep_human_bed_queen', x: 5, y: 5 }
      };

      const resBed = reduceBuilding(sFree, buyBedCmd, { ...ctx, commandId: 'c_free_bed' });
      expect(resBed.ok).toBe(true);
      if (!resBed.ok) return;

      expect(resBed.state.economy.wallet.earnedCash).toBe(1000); // Unchanged!
      const bed = resBed.state.building.lots.lot_home.objects[0];
      expect(bed.provenance).toBe('free_build');
    });

    it('selling or demolishing a free_build object yields $0 earned cash refund', () => {
      // Enter free build, place bed, commit
      let s = reduceBuilding(initialState, { type: 'ENTER_FREE_BUILD', payload: {} }, { ...ctx, commandId: 'c1' }).state!;
      s = reduceBuilding(s, {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'sleep_human_bed_queen', x: 5, y: 5 }
      }, { ...ctx, commandId: 'c2' }).state!;
      s = reduceBuilding(s, { type: 'COMMIT_FREE_BUILD', payload: {} }, { ...ctx, commandId: 'c3' }).state!;

      expect(s.building.activeFreeBuild).toBe(false);
      expect(s.economy.wallet.mode).toBe('normal');

      const bedObjId = s.building.lots.lot_home.objects[0].id;
      const cashBeforeSell = s.economy.wallet.earnedCash;

      // Sell the free_build item in normal mode
      const sellRes = reduceBuilding(s, { type: 'SELL_OBJECT', payload: { lotId: 'lot_home', objectId: bedObjId } }, { ...ctx, commandId: 'c4' });
      expect(sellRes.ok).toBe(true);
      if (!sellRes.ok) return;

      // Earned cash MUST NOT INCREASE
      expect(sellRes.state.economy.wallet.earnedCash).toBe(cashBeforeSell);
    });

    it('cancels free build session and restores previous lot state exactly', () => {
      // 1. Place sofa in normal mode
      let s = reduceBuilding(initialState, {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      }, { ...ctx, commandId: 'c1' }).state!;

      expect(s.building.lots.lot_home.objects.length).toBe(1);

      // 2. Enter free build
      s = reduceBuilding(s, { type: 'ENTER_FREE_BUILD', payload: {} }, { ...ctx, commandId: 'c2' }).state!;

      // 3. Place another bed in free build
      s = reduceBuilding(s, {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'sleep_human_bed_queen', x: 10, y: 5 }
      }, { ...ctx, commandId: 'c3' }).state!;

      expect(s.building.lots.lot_home.objects.length).toBe(2);

      // 4. Cancel free build
      const cancelRes = reduceBuilding(s, { type: 'CANCEL_FREE_BUILD', payload: {} }, { ...ctx, commandId: 'c4' });
      expect(cancelRes.ok).toBe(true);
      if (!cancelRes.ok) return;

      expect(cancelRes.state.building.activeFreeBuild).toBe(false);
      expect(cancelRes.state.building.lots.lot_home.objects.length).toBe(1); // Bed reverted!
      expect(cancelRes.state.building.lots.lot_home.objects[0].catalogId).toBe('seat_cushion_sofa');
    });

    it('ensures idempotency on command retries', () => {
      const placeCmd: BuildingCommand = {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      };

      const res1 = reduceBuilding(initialState, placeCmd, { ...ctx, commandId: 'retry_cmd_100' });
      expect(res1.ok).toBe(true);
      if (!res1.ok) return;

      // Re-run exact same command ID
      const res2 = reduceBuilding(res1.state, placeCmd, { ...ctx, commandId: 'retry_cmd_100' });
      expect(res2.ok).toBe(true);
      if (!res2.ok) return;

      // Money only deducted ONCE, only ONE object added
      expect(res2.state.economy.wallet.earnedCash).toBe(1000 - 250);
      expect(res2.state.building.lots.lot_home.objects.length).toBe(1);
    });
  });
});
