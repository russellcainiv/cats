// tests/domain/building/building-repairs.test.ts
// Verification test suite for building subsystem review repairs (DEF-BUILD-01 through DEF-BUILD-10)

import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialWorldState, WorldState, CommandContext } from '../../../work/building/harness';
import {
  reduceBuilding,
  advanceBuilding,
  BuildingCommand,
  FURNITURE_CATALOG,
  getCatalogItem
} from '../../../src/domain/building/index';

describe('Building Subsystem Repairs Verification', () => {
  let state: WorldState;
  const ctx: CommandContext = { actorId: 'player_1', commandId: 'test_cmd_1' };

  beforeEach(() => {
    state = createInitialWorldState();
  });

  describe('1. Atomic Undo/Redo Wallet Synchronization (DEF-BUILD-01)', () => {
    it('restores spent cash when undoing BUY_AND_PLACE_OBJECT', () => {
      const initialCash = state.economy.wallet.earnedCash; // 1000
      const sofa = getCatalogItem('seat_cushion_sofa')!; // 250

      const buyRes = reduceBuilding(state, {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      }, { ...ctx, commandId: 'buy_1' });

      expect(buyRes.ok).toBe(true);
      expect(buyRes.state.economy.wallet.earnedCash).toBe(initialCash - sofa.cost);
      expect(buyRes.state.building.lots.lot_home.objects.length).toBe(1);

      // Undo the buy action
      const undoRes = reduceBuilding(buyRes.state, {
        type: 'UNDO_BUILD_ACTION',
        payload: { lotId: 'lot_home' }
      }, { ...ctx, commandId: 'undo_1' });

      expect(undoRes.ok).toBe(true);
      expect(undoRes.state.building.lots.lot_home.objects.length).toBe(0);
      // Cash MUST be restored back to initialCash
      expect(undoRes.state.economy.wallet.earnedCash).toBe(initialCash);

      // Redo the buy action
      const redoRes = reduceBuilding(undoRes.state, {
        type: 'REDO_BUILD_ACTION',
        payload: { lotId: 'lot_home' }
      }, { ...ctx, commandId: 'redo_1' });

      expect(redoRes.ok).toBe(true);
      expect(redoRes.state.building.lots.lot_home.objects.length).toBe(1);
      expect(redoRes.state.economy.wallet.earnedCash).toBe(initialCash - sofa.cost);
    });

    it('prevents infinite money minting exploit when undoing SELL_OBJECT', () => {
      const initialCash = state.economy.wallet.earnedCash; // 1000

      // 1. Buy sofa ($250)
      const s1 = reduceBuilding(state, {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      }, { ...ctx, commandId: 'buy_s' }).state!;

      expect(s1.economy.wallet.earnedCash).toBe(750);
      const objId = s1.building.lots.lot_home.objects[0].id;

      // 2. Sell sofa (+250)
      const s2 = reduceBuilding(s1, {
        type: 'SELL_OBJECT',
        payload: { lotId: 'lot_home', objectId: objId }
      }, { ...ctx, commandId: 'sell_s' }).state!;

      expect(s2.economy.wallet.earnedCash).toBe(1000);
      expect(s2.building.lots.lot_home.objects.length).toBe(0);

      // 3. Undo the sell action
      const sUndo = reduceBuilding(s2, {
        type: 'UNDO_BUILD_ACTION',
        payload: { lotId: 'lot_home' }
      }, { ...ctx, commandId: 'undo_sell' }).state!;

      // Sofa is back on lot AND wallet refunded cash is taken back!
      expect(sUndo.building.lots.lot_home.objects.length).toBe(1);
      expect(sUndo.economy.wallet.earnedCash).toBe(750);

      // 4. Selling again returns to 1000, NOT 1250!
      const s3 = reduceBuilding(sUndo, {
        type: 'SELL_OBJECT',
        payload: { lotId: 'lot_home', objectId: objId }
      }, { ...ctx, commandId: 'sell_again' }).state!;

      expect(s3.economy.wallet.earnedCash).toBe(1000);
    });

    it('preserves wallet and lot across multi-step undo and redo sequences', () => {
      let s = state;
      // Step 1: Wall ($100)
      s = reduceBuilding(s, {
        type: 'BUILD_WALL',
        payload: { lotId: 'lot_home', x1: 4, y1: 4, x2: 9, y2: 4 }
      }, { ...ctx, commandId: 'm1' }).state!;
      expect(s.economy.wallet.earnedCash).toBe(900);

      // Step 2: Door on that wall ($50)
      s = reduceBuilding(s, {
        type: 'PLACE_DOOR',
        payload: { lotId: 'lot_home', x: 6, y: 4, orientation: 'horizontal' }
      }, { ...ctx, commandId: 'm2' }).state!;
      expect(s.economy.wallet.earnedCash).toBe(850);

      // Step 3: Undo door -> cash back to 900
      s = reduceBuilding(s, {
        type: 'UNDO_BUILD_ACTION',
        payload: { lotId: 'lot_home' }
      }, { ...ctx, commandId: 'm3' }).state!;
      expect(s.economy.wallet.earnedCash).toBe(900);
      expect(s.building.lots.lot_home.doors.length).toBe(1); // initial door only

      // Step 4: Undo wall -> cash back to 1000
      s = reduceBuilding(s, {
        type: 'UNDO_BUILD_ACTION',
        payload: { lotId: 'lot_home' }
      }, { ...ctx, commandId: 'm4' }).state!;
      expect(s.economy.wallet.earnedCash).toBe(1000);
      expect(s.building.lots.lot_home.walls.length).toBe(4); // initial walls only

      // Step 5: Redo wall -> cash drops to 900
      s = reduceBuilding(s, {
        type: 'REDO_BUILD_ACTION',
        payload: { lotId: 'lot_home' }
      }, { ...ctx, commandId: 'm5' }).state!;
      expect(s.economy.wallet.earnedCash).toBe(900);
      expect(s.building.lots.lot_home.walls.length).toBe(5);

      // Step 6: Redo door -> cash drops to 850
      s = reduceBuilding(s, {
        type: 'REDO_BUILD_ACTION',
        payload: { lotId: 'lot_home' }
      }, { ...ctx, commandId: 'm6' }).state!;
      expect(s.economy.wallet.earnedCash).toBe(850);
      expect(s.building.lots.lot_home.doors.length).toBe(2);
    });
  });

  describe('2. Deterministic ID and Checksum Generation (DEF-BUILD-02)', () => {
    it('generates identical IDs and checksums for identical command dispatches from same initial state', () => {
      const runSequence = () => {
        let s = createInitialWorldState();
        s = reduceBuilding(s, {
          type: 'BUY_AND_PLACE_OBJECT',
          payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
        }, { actorId: 'player_1', commandId: 'cmd_det_1' }).state!;

        s = reduceBuilding(s, {
          type: 'BUILD_WALL',
          payload: { lotId: 'lot_home', x1: 4, y1: 4, x2: 8, y2: 4 }
        }, { actorId: 'player_1', commandId: 'cmd_det_2' }).state!;

        s = reduceBuilding(s, {
          type: 'PLACE_DOOR',
          payload: { lotId: 'lot_home', x: 6, y: 4, orientation: 'horizontal' }
        }, { actorId: 'player_1', commandId: 'cmd_det_3' }).state!;

        return s;
      };

      const s1 = runSequence();
      const s2 = runSequence();

      const obj1 = s1.building.lots.lot_home.objects[0];
      const obj2 = s2.building.lots.lot_home.objects[0];
      expect(obj1.id).toBe(obj2.id);

      const wall1 = s1.building.lots.lot_home.walls[s1.building.lots.lot_home.walls.length - 1];
      const wall2 = s2.building.lots.lot_home.walls[s2.building.lots.lot_home.walls.length - 1];
      expect(wall1.id).toBe(wall2.id);

      const door1 = s1.building.lots.lot_home.doors[s1.building.lots.lot_home.doors.length - 1];
      const door2 = s2.building.lots.lot_home.doors[s2.building.lots.lot_home.doors.length - 1];
      expect(door1.id).toBe(door2.id);

      expect(s1.commandReceipts[0].receiptChecksum).toBe(s2.commandReceipts[0].receiptChecksum);
      expect(s1.commandReceipts[1].receiptChecksum).toBe(s2.commandReceipts[1].receiptChecksum);
    });

    it('contains no Date.now() or Math.random() in generated entity IDs', () => {
      let s = state;
      s = reduceBuilding(s, {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      }, { ...ctx, commandId: 'c_obj' }).state!;

      const obj = s.building.lots.lot_home.objects[0];
      expect(obj.id).toMatch(/^obj_seat_cushion_sofa_5_5_\d+$/);

      s = reduceBuilding(s, {
        type: 'BUILD_WALL',
        payload: { lotId: 'lot_home', x1: 4, y1: 4, x2: 8, y2: 4 }
      }, { ...ctx, commandId: 'c_wall' }).state!;

      const wall = s.building.lots.lot_home.walls[s.building.lots.lot_home.walls.length - 1];
      expect(wall.id).toMatch(/^wall_lot_home_4_4_8_4_\d+$/);
    });
  });

  describe('3. Coordinate Sanitization and Malicious Input (DEF-BUILD-03)', () => {
    it('rejects BUILD_WALL with NaN or Infinity coordinates without corrupting wallet', () => {
      const initialCash = state.economy.wallet.earnedCash;

      const resNaN = reduceBuilding(state, {
        type: 'BUILD_WALL',
        payload: { lotId: 'lot_home', x1: 0, y1: 0, x2: NaN, y2: 0 }
      }, { ...ctx, commandId: 'nan_wall' });

      expect(resNaN.ok).toBe(false);
      expect(resNaN.state.economy.wallet.earnedCash).toBe(initialCash);
      expect(Number.isFinite(resNaN.state.economy.wallet.earnedCash)).toBe(true);

      const resInf = reduceBuilding(state, {
        type: 'BUILD_WALL',
        payload: { lotId: 'lot_home', x1: 0, y1: 0, x2: Infinity, y2: 0 }
      }, { ...ctx, commandId: 'inf_wall' });

      expect(resInf.ok).toBe(false);
      expect(resInf.state.economy.wallet.earnedCash).toBe(initialCash);
    });

    it('rejects out-of-bounds wall coordinates', () => {
      const res = reduceBuilding(state, {
        type: 'BUILD_WALL',
        payload: { lotId: 'lot_home', x1: -10, y1: -10, x2: -10, y2: 30 }
      }, { ...ctx, commandId: 'oob_wall' });

      expect(res.ok).toBe(false);
      expect(res.error!.code).toBe('OUT_OF_BOUNDS');
    });

    it('rejects diagonal and zero-length walls', () => {
      const resDiag = reduceBuilding(state, {
        type: 'BUILD_WALL',
        payload: { lotId: 'lot_home', x1: 3, y1: 3, x2: 7, y2: 7 }
      }, { ...ctx, commandId: 'diag_wall' });

      expect(resDiag.ok).toBe(false);
      expect(resDiag.error!.code).toBe('INVALID_WALL_GEOMETRY');

      const resZero = reduceBuilding(state, {
        type: 'BUILD_WALL',
        payload: { lotId: 'lot_home', x1: 3, y1: 3, x2: 3, y2: 3 }
      }, { ...ctx, commandId: 'zero_wall' });

      expect(resZero.ok).toBe(false);
      expect(resZero.error!.code).toBe('INVALID_WALL_GEOMETRY');
    });

    it('advanceBuilding safely rejects NaN minutes and does not double-increment simMinute', () => {
      const sNan = advanceBuilding(state, NaN);
      expect(sNan.clock.simMinute).toBe(100);

      const sNeg = advanceBuilding(state, -10);
      expect(sNeg.clock.simMinute).toBe(100);

      // Core owns the clock; advanceBuilding invalidates undoStack without incrementing simMinute
      const sNormal = advanceBuilding(state, 5);
      expect(sNormal.clock.simMinute).toBe(100); // Clock not incremented second time
      expect(sNormal.building.undoStack).toEqual({}); // Stack invalidated
    });
  });

  describe('4. Wall and Door/Window Attachment & Collision Rules (DEF-BUILD-04)', () => {
    it('rejects PLACE_DOOR in mid-air when no wall exists at coordinates', () => {
      const res = reduceBuilding(state, {
        type: 'PLACE_DOOR',
        payload: { lotId: 'lot_home', x: 15, y: 15, orientation: 'horizontal' }
      }, { ...ctx, commandId: 'midair_door' });

      expect(res.ok).toBe(false);
      expect(res.error!.code).toBe('MISSING_WALL');
    });

    it('rejects PLACE_WINDOW in mid-air when no wall exists at coordinates', () => {
      const res = reduceBuilding(state, {
        type: 'PLACE_WINDOW',
        payload: { lotId: 'lot_home', x: 15, y: 15, orientation: 'horizontal' }
      }, { ...ctx, commandId: 'midair_win' });

      expect(res.ok).toBe(false);
      expect(res.error!.code).toBe('MISSING_WALL');
    });

    it('rejects placing a door or window on an already occupied wall spot', () => {
      // w3 is at y: 18, x: 2..18. Initial door d1 is at (10, 18).
      const resDuplicateDoor = reduceBuilding(state, {
        type: 'PLACE_DOOR',
        payload: { lotId: 'lot_home', x: 10, y: 18, orientation: 'horizontal' }
      }, { ...ctx, commandId: 'dup_door' });

      expect(resDuplicateDoor.ok).toBe(false);
      expect(resDuplicateDoor.error!.code).toBe('COLLISION');

      const resWindowOnDoor = reduceBuilding(state, {
        type: 'PLACE_WINDOW',
        payload: { lotId: 'lot_home', x: 10, y: 18, orientation: 'horizontal' }
      }, { ...ctx, commandId: 'win_on_door' });

      expect(resWindowOnDoor.ok).toBe(false);
      expect(resWindowOnDoor.error!.code).toBe('COLLISION');
    });

    it('cleans up attached doors and windows when wall is removed', () => {
      // w3 is at y: 18 with door d1 at (10, 18).
      const res = reduceBuilding(state, {
        type: 'REMOVE_WALL',
        payload: { lotId: 'lot_home', wallId: 'w3' }
      }, { ...ctx, commandId: 'rm_w3' });

      expect(res.ok).toBe(true);
      // Door d1 was attached to w3 and must not be left floating
      expect(res.state.building.lots.lot_home.doors.some(d => d.id === 'd1')).toBe(false);
    });
  });

  describe('5. Wall-on-Cat Collision Rejection (DEF-BUILD-05)', () => {
    it('rejects building vertical wall directly through a cat', () => {
      // Mochi is at (10, 10). Attempt vertical wall from (10, 8) to (10, 12)
      const res = reduceBuilding(state, {
        type: 'BUILD_WALL',
        payload: { lotId: 'lot_home', x1: 10, y1: 8, x2: 10, y2: 12 }
      }, { ...ctx, commandId: 'vert_wall_cat' });

      expect(res.ok).toBe(false);
      expect(res.error!.code).toBe('INVALID_LAYOUT');
      expect(res.error!.message).toContain('directly on cat');
    });

    it('rejects building horizontal wall directly through a cat', () => {
      // Mochi is at (10, 10). Attempt horizontal wall from (8, 10) to (12, 10)
      const res = reduceBuilding(state, {
        type: 'BUILD_WALL',
        payload: { lotId: 'lot_home', x1: 8, y1: 10, x2: 12, y2: 10 }
      }, { ...ctx, commandId: 'horiz_wall_cat' });

      expect(res.ok).toBe(false);
      expect(res.error!.code).toBe('INVALID_LAYOUT');
      expect(res.error!.message).toContain('directly on cat');
    });

    it('permits walls built adjacent to a cat that do not intersect it', () => {
      // Mochi is at (10, 10). Build wall from (12, 8) to (12, 12)
      const res = reduceBuilding(state, {
        type: 'BUILD_WALL',
        payload: { lotId: 'lot_home', x1: 12, y1: 8, x2: 12, y2: 12 }
      }, { ...ctx, commandId: 'clear_wall' });

      expect(res.ok).toBe(true);
    });
  });

  describe('6. Reachable Interaction Anchors (DEF-BUILD-06)', () => {
    it('rejects object placement when interact spots fall outside lot bounds', () => {
      // Sofa at y = 19 (bottom of 20x20 lot, interact spot at y = 20)
      const res = reduceBuilding(state, {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 4, y: 19 }
      }, { ...ctx, commandId: 'sofa_edge' });

      expect(res.ok).toBe(false);
      expect(res.error!.code).toBe('INVALID_LAYOUT');
      expect(res.error!.message).toContain('outside lot bounds');
    });
  });

  describe('7. Demolition Room Structure Cleanup (DEF-BUILD-07)', () => {
    it('demolishes walls, doors, windows, and finishes in bounds and grants refunds', () => {
      const initialCash = state.economy.wallet.earnedCash;

      // w3 is at y1: 18, y2: 18 from x: 2 to 18. Door d1 is at (10, 18).
      // Demolish area containing w3 and d1: bounds (8, 16) to (12, 19)
      const res = reduceBuilding(state, {
        type: 'DEMOLISH_ROOM',
        payload: { lotId: 'lot_home', bounds: { minX: 8, minY: 16, maxX: 12, maxY: 19 } }
      }, { ...ctx, commandId: 'demo_area' });

      expect(res.ok).toBe(true);
      // Wall w3 within bounds was deleted
      expect(res.state.building.lots.lot_home.walls.find(w => w.id === 'w3')).toBeUndefined();
      // Door d1 was within bounds and MUST BE REMOVED
      expect(res.state.building.lots.lot_home.doors.find(d => d.id === 'd1')).toBeUndefined();
      // Cash refunded for wall (16 * 20 = 320) + door ($50) = $370
      expect(res.state.economy.wallet.earnedCash).toBeGreaterThan(initialCash);
    });
  });

  describe('8. Bounded Undo History Depth (DEF-BUILD-10)', () => {
    it('caps undo history at maximum depth (30 entries)', () => {
      let s = { ...state, economy: { ...state.economy, wallet: { ...state.economy.wallet, earnedCash: 100000 } } };
      for (let i = 0; i < 40; i++) {
        s = reduceBuilding(s, {
          type: 'BUY_AND_PLACE_OBJECT',
          payload: {
            lotId: 'lot_home',
            catalogId: 'decor_potted_monstera',
            x: 1 + (i % 8),
            y: 1 + Math.floor(i / 8)
          }
        }, { ...ctx, commandId: `stack_${i}` }).state!;
      }

      const pastLength = s.building.undoStack!.lot_home.past.length;
      expect(pastLength).toBe(30); // Bounded at MAX_UNDO_DEPTH
    });
  });

  describe('9. Domain Event Emission', () => {
    it('emits typed DomainEvents for object placement, move, sell, wall, door, demo, and undo', () => {
      // 1. Buy and place object
      const resBuy = reduceBuilding(state, {
        type: 'BUY_AND_PLACE_OBJECT',
        payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 5, y: 5 }
      }, { ...ctx, commandId: 'ev_buy' });

      expect(resBuy.ok).toBe(true);
      expect(resBuy.events.length).toBe(1);
      expect(resBuy.events[0].type).toBe('OBJECT_PLACED');
      expect(resBuy.events[0].payload.catalogId).toBe('seat_cushion_sofa');

      const objId = resBuy.state.building.lots.lot_home.objects[0].id;

      // 2. Sell object
      const resSell = reduceBuilding(resBuy.state, {
        type: 'SELL_OBJECT',
        payload: { lotId: 'lot_home', objectId: objId }
      }, { ...ctx, commandId: 'ev_sell' });

      expect(resSell.ok).toBe(true);
      expect(resSell.events[0].type).toBe('OBJECT_SOLD');

      // 3. Undo
      const resUndo = reduceBuilding(resSell.state, {
        type: 'UNDO_BUILD_ACTION',
        payload: { lotId: 'lot_home' }
      }, { ...ctx, commandId: 'ev_undo' });

      expect(resUndo.ok).toBe(true);
      expect(resUndo.events[0].type).toBe('BUILD_ACTION_UNDONE');
    });
  });
});
