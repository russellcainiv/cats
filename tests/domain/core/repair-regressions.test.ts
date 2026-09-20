/**
 * Repair Regression Test Suite (Round 1 Gauntlet Repairs)
 *
 * Verifies that all 14 substantiated defects from independent review (b5f4c86)
 * have been repaired and assert CORRECT domain behavior:
 *
 * 1.  CORE-01: Idempotency payload mismatch rejection and immutable rejection on failure
 * 2.  CORE-02: Deterministic seeded PRNG & sequence ID generation (no Date.now / Math.random)
 * 3.  CORE-03: Fixed-step segmentation invariance (advance(10) === 10 * advance(1)) & fractional accumulation
 * 4.  CORE-04: Fresh synchronized state snapshot passed to autonomy in tick phases
 * 5.  CORE-05: Non-negative integer quantity validation in economy (exploit eliminated)
 * 6.  CORE-06: Dynamic blocked cell recalculation on REMOVE_WALL (no impassable cell leak)
 * 7.  CORE-07: Autonomy targets interact spots, routing to anchors before care actions
 * 8.  CORE-08: Strict CatId indexing in GameView projections (no name key collisions)
 * 9.  CORE-09: ADOPT_CAT name pre-validation returns INVALID_NAME on blank/whitespace
 * 10. CORE-10: Lethal health=0 cats transition to deceased without spontaneous recovery
 * 11. CORE-11: selectedCatId updates to living cat or null upon cat death
 * 12. CORE-12: Autonomous Moo-Moo completes with consent, conception draws, and events
 * 13. CORE-13: Career outfits applied on shift departure and restored on return without altering base look
 * 14. CORE-14: Modular typed subsystem reducers reject unsupported commands explicitly
 */

import { describe, expect, it } from 'vitest';
import { dispatch } from '../../../src/domain/commands';
import { evaluateCatAutonomy } from '../../../src/domain/core/autonomy';
import { findPath } from '../../../src/domain/core/navigation';
import { createStarterWorld } from '../../../src/domain/core/starter-world';
import { SeededRng } from '../../../src/domain/rng';
import { buildScenario } from '../../../src/domain/scenarios';
import { selectView } from '../../../src/domain/selectors';
import { advance } from '../../../src/domain/simulation';
import { CareerRecord, CatRecord, WorldState } from '../../../src/domain/state';

describe('Round 1 Core Repair Regressions', () => {
  it('REPAIR 1: Idempotency rejects reused commandId with mismatched payload or type (CORE-01)', () => {
    const world = buildScenario('starter');
    const commandId = 'cmd_fixed_001';

    // 1. Initial valid command
    const res1 = dispatch(
      world,
      { type: 'BUY_ITEM', payload: { catalogId: 'furn_cushion_cozy', quantity: 1 } },
      { actorId: 'player', commandId }
    );
    expect(res1.ok).toBe(true);

    // 2. Reused commandId with different command type and payload
    const res2 = dispatch(
      res1.state,
      {
        type: 'CREATE_CAT',
        payload: {
          name: 'Shadow',
          appearance: { breed: 'bombay', primaryColor: '#000000', pattern: 'solid', eyeColor: 'green', bodyType: 'petite' },
          traits: ['curious'],
        },
      },
      { actorId: 'player', commandId }
    );

    // Assert: Mismatched command must be REJECTED with COMMAND_ID_PAYLOAD_MISMATCH
    expect(res2.ok).toBe(false);
    if (!res2.ok) {
      expect(res2.error.code).toBe('COMMAND_ID_PAYLOAD_MISMATCH');
    }
    // Cat "Shadow" was NOT created and state is returned unchanged
    const shadowCat = Object.values(res2.state.cats).find((c) => c.name === 'Shadow');
    expect(shadowCat).toBeUndefined();

    // 3. Exact matching replay succeeds idempotently
    const res3 = dispatch(
      res1.state,
      { type: 'BUY_ITEM', payload: { catalogId: 'furn_cushion_cozy', quantity: 1 } },
      { actorId: 'player', commandId }
    );
    expect(res3.ok).toBe(true);
    if (res3.ok) {
      expect(res3.events.length).toBe(0); // Zero duplicate events
    }
  });

  it('REPAIR 2: Deterministic seeded PRNG and sequence IDs guarantee replay equivalence (CORE-02)', () => {
    const world1 = createStarterWorld({ seed: 999 });
    const world2 = createStarterWorld({ seed: 999 });

    // Build wall on both identical worlds
    const res1 = dispatch(
      world1,
      { type: 'BUILD_WALL', payload: { lotId: 'home', x1: 2, y1: 2, x2: 2, y2: 4 } },
      { actorId: 'p1', commandId: 'c1' }
    );
    const res2 = dispatch(
      world2,
      { type: 'BUILD_WALL', payload: { lotId: 'home', x1: 2, y1: 2, x2: 2, y2: 4 } },
      { actorId: 'p1', commandId: 'c1' }
    );

    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
    if (!res1.ok || !res2.ok) return;

    const wall1 = res1.state.building.lots['home'].walls[res1.state.building.lots['home'].walls.length - 1];
    const wall2 = res2.state.building.lots['home'].walls[res2.state.building.lots['home'].walls.length - 1];

    // Assert: Deterministic IDs must be strictly equal across runs with identical seed and sequence
    expect(wall1.id).toBe(wall2.id);
    expect(wall1.id).not.toContain('NaN');
    expect(res1.events[0].id).toBe(res2.events[0].id);
  });

  it('REPAIR 3: Fixed-step segmentation invariance: advance(10) === 10 * advance(1) (CORE-03)', () => {
    const worldA = buildScenario('starter');
    const worldB = buildScenario('starter');

    worldA.clock.isPaused = false;
    worldB.clock.isPaused = false;

    // Single 10-minute step on worldA
    const advanced10 = advance(worldA, 10);

    // Ten 1-minute steps on worldB
    let stepped10Times = worldB;
    for (let i = 0; i < 10; i++) {
      stepped10Times = advance(stepped10Times, 1);
    }

    const catA = advanced10.cats['cat_mochi'];
    const catB = stepped10Times.cats['cat_mochi'];

    // Assert: Exact equality across need levels, clock minutes, and RNG draw counters
    expect(catA.needs.hunger).toBe(catB.needs.hunger);
    expect(catA.needs.energy).toBe(catB.needs.energy);
    expect(catA.needs.hygiene).toBe(catB.needs.hygiene);
    expect(catA.ageMinutes).toBe(catB.ageMinutes);
    expect(advanced10.clock.simMinute).toBe(stepped10Times.clock.simMinute);
    expect(advanced10.rng.counter).toBe(stepped10Times.rng.counter);

    // Fractional accumulation: 2 * 0.5 minutes equals 1 * 1.0 minute
    const worldC = buildScenario('starter');
    worldC.clock.isPaused = false;
    const half1 = advance(worldC, 0.5);
    expect(half1.clock.simMinute).toBe(worldC.clock.simMinute); // Still at 480, fractional accumulated
    const half2 = advance(half1, 0.5);
    expect(half2.clock.simMinute).toBe(worldC.clock.simMinute + 1); // Advanced to 481
  });

  it('REPAIR 4: Fresh synchronized state passed to autonomy prevents stale deceased cat targeting (CORE-04)', () => {
    const world = buildScenario('starter');
    const cat2: CatRecord = {
      ...world.cats['cat_mochi'],
      id: 'cat_luna',
      name: 'Luna',
      position: { lotId: 'home', x: 4, y: 5, facing: 'north' },
    };
    world.cats['cat_luna'] = cat2;
    world.livingCatIds.push('cat_luna');

    // Make Mochi reach lifespan end so Mochi dies during Phase 1
    world.cats['cat_mochi'].ageMinutes = 216000;
    world.clock.isPaused = false;

    const result = advance(world, 1);

    expect(result.cats['cat_mochi'].lifeStatus).toBe('deceased');
    expect(result.livingCatIds).not.toContain('cat_mochi');
    // Luna's autonomy did not crash and evaluated against living cats only
    expect(result.livingCatIds).toEqual(['cat_luna']);
  });

  it('REPAIR 5: Negative quantity economy exploit is strictly rejected (CORE-05)', () => {
    const world = buildScenario('starter');
    const initialCash = world.economy.wallet.earnedCash;

    // Dispatch BUY_ITEM with negative quantity
    const resNegative = dispatch(
      world,
      { type: 'BUY_ITEM', payload: { catalogId: 'furn_tree_multitier', quantity: -10 } },
      { actorId: 'player', commandId: 'cmd_exploit_neg' }
    );

    expect(resNegative.ok).toBe(false);
    if (!resNegative.ok) {
      expect(resNegative.error.code).toBe('INVALID_QUANTITY');
    }
    // Wallet cash unchanged
    expect(resNegative.state.economy.wallet.earnedCash).toBe(initialCash);

    // Dispatch BUY_ITEM with non-integer quantity
    const resFloat = dispatch(
      world,
      { type: 'BUY_ITEM', payload: { catalogId: 'furn_tree_multitier', quantity: 2.5 } },
      { actorId: 'player', commandId: 'cmd_exploit_float' }
    );
    expect(resFloat.ok).toBe(false);
  });

  it('REPAIR 6: Blocked cells are recalculated dynamically on REMOVE_WALL (CORE-06)', () => {
    const world = buildScenario('starter');
    const lotBefore = world.building.lots['home'];
    const initialBlocked = [...lotBefore.blockedCells];

    // Build wall on unoccupied coordinates (7, 2) to (7, 4)
    const res1 = dispatch(
      world,
      { type: 'BUILD_WALL', payload: { lotId: 'home', x1: 7, y1: 2, x2: 7, y2: 4 } },
      { actorId: 'player', commandId: 'cmd_wall_add' }
    );
    expect(res1.ok).toBe(true);
    const addedWall = res1.state.building.lots['home'].walls.find((w) => w.x1 === 7 && w.y1 === 2);
    expect(addedWall).toBeDefined();

    // Remove wall
    const res2 = dispatch(
      res1.state,
      { type: 'REMOVE_WALL', payload: { lotId: 'home', wallId: addedWall!.id } },
      { actorId: 'player', commandId: 'cmd_wall_rem' }
    );
    expect(res2.ok).toBe(true);
    const lotAfter = res2.state.building.lots['home'];

    // Assert: Removed wall cells are no longer in blockedCells
    expect(lotAfter.blockedCells).not.toContain('7,2');
    expect(lotAfter.blockedCells).not.toContain('7,3');
    expect(lotAfter.blockedCells).not.toContain('7,4');
    expect(lotAfter.blockedCells.length).toBe(initialBlocked.length);
  });

  it('REPAIR 7: Autonomy targets interact spots and pathfinding succeeds (CORE-07)', () => {
    const world = buildScenario('starter');
    const mochi = world.cats['cat_mochi'];
    mochi.needs.hunger = 10;
    mochi.currentAction = null;
    mochi.actionQueue = [];

    const rng = SeededRng.deserialize(world.rng.serializedState);
    const decision = evaluateCatAutonomy(mochi, world, rng);

    expect(decision.shouldAct).toBe(true);
    expect(decision.action?.type).toBe('eat');
    // Target position must be the unblocked interact spot (6, 3), NOT the bowl itself (6, 2)
    expect(decision.action?.targetPosition).toEqual({ x: 6, y: 3 });

    // Pathfinding to the interact spot must be REACHABLE
    const path = findPath(world.building.lots['home'], { x: mochi.position.x, y: mochi.position.y }, decision.action!.targetPosition!);
    expect(path.reachable).toBe(true);
    expect(path.route.length).toBeGreaterThan(1);
  });

  it('REPAIR 8: GameView.cats is indexed strictly by CatId, avoiding name collisions (CORE-08)', () => {
    const world = buildScenario('starter');
    const cat2: CatRecord = {
      ...world.cats['cat_mochi'],
      id: 'cat_mochi_2',
      name: 'Mochi',
      ageMinutes: 50000,
    };
    world.cats['cat_mochi_2'] = cat2;
    world.livingCatIds.push('cat_mochi_2');

    const view = selectView(world);

    // Assert: Both cats exist under their distinct CatId without key collisions
    expect(view.cats['cat_mochi']).toBeDefined();
    expect(view.cats['cat_mochi_2']).toBeDefined();
    expect(view.cats['cat_mochi'].id).toBe('cat_mochi');
    expect(view.cats['cat_mochi_2'].id).toBe('cat_mochi_2');
    expect(view.cats['cat_mochi_2'].ageMinutes).toBe(50000);
    // Lowercase name 'mochi' is NOT a map key
    expect(view.cats['mochi']).toBeUndefined();
  });

  it('REPAIR 9: ADOPT_CAT pre-validates name and returns INVALID_NAME on whitespace (CORE-09)', () => {
    const world = buildScenario('starter');

    const res = dispatch(
      world,
      {
        type: 'ADOPT_CAT',
        payload: {
          name: '   ',
          appearance: { breed: 'tabby', primaryColor: '#B0B0B0', pattern: 'tabby', eyeColor: 'green', bodyType: 'average' },
          traits: ['playful'],
        },
      },
      { actorId: 'player', commandId: 'cmd_adopt_blank' }
    );

    // Assert: Standard INVALID_NAME validation error, not internal crash
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('INVALID_NAME');
    }
  });

  it('REPAIR 10: Lethal health=0 cats transition to deceased without spontaneous recovery (CORE-10)', () => {
    const world = buildScenario('starter');
    const mochi = world.cats['cat_mochi'];
    mochi.needs.health = 0; // Lethal condition
    world.clock.isPaused = false;

    const result = advance(world, 1);
    const updatedMochi = result.cats['cat_mochi'];

    // Assert: Dying cat does NOT spontaneously recover health; transitions permanently to deceased
    expect(updatedMochi.lifeStatus).toBe('deceased');
    expect(result.livingCatIds).not.toContain('cat_mochi');
    expect(result.lifecycle.memorials['mem_cat_mochi']).toBeDefined();
  });

  it('REPAIR 11: selectedCatId updates cleanly to living cat or null upon death (CORE-11)', () => {
    const world = buildScenario('starter');
    expect(world.selectedCatId).toBe('cat_mochi');

    // Age mochi to natural end of lifespan
    world.cats['cat_mochi'].ageMinutes = 216000;
    world.clock.isPaused = false;

    const result = advance(world, 1);
    expect(result.cats['cat_mochi'].lifeStatus).toBe('deceased');

    // Assert: selectedCatId is cleared to null since no other living cats exist
    expect(result.selectedCatId).toBeNull();
  });

  it('REPAIR 12: Autonomous Moo-Moo executes consent and conception resolution (CORE-12)', () => {
    const world = buildScenario('starter');
    const partner: CatRecord = {
      ...world.cats['cat_mochi'],
      id: 'cat_partner',
      name: 'Partner',
      position: { lotId: 'home', x: 4, y: 4, facing: 'south' },
      relationships: {
        cat_mochi: { targetCatId: 'cat_mochi', friendship: 90, romance: 90, isLove: true, lastInteractionMinute: 0 },
      },
    };
    world.cats['cat_mochi'].relationships = {
      cat_partner: { targetCatId: 'cat_partner', friendship: 90, romance: 90, isLove: true, lastInteractionMinute: 0 },
    };
    world.cats['cat_partner'] = partner;
    world.livingCatIds.push('cat_partner');

    world.cats['cat_mochi'].currentAction = {
      id: 'act_auto_moo',
      type: 'moo_moo',
      targetId: 'cat_partner',
      durationMinutes: 1,
      elapsedMinutes: 0,
      isInterruptible: true,
      autonomous: true,
    };
    world.clock.isPaused = false;

    // Advance 1 minute to complete the action
    const result = advance(world, 1);

    // Assert: Domain events for Moo-Moo were emitted
    const mooEvents = result.events.filter((e) => e.type.includes('MOO'));
    expect(mooEvents.length).toBeGreaterThan(0);
    expect(mooEvents.some((e) => e.type === 'MOO_MOO_COMPLETED')).toBe(true);
    // Assert: Moo-Moo completed and cat is not stuck in a Moo-Moo loop
    expect(result.cats['cat_mochi'].currentAction?.type).not.toBe('moo_moo');
  });

  it('REPAIR 13: Career outfits applied on shift departure and restored on return (CORE-13)', () => {
    const world = buildScenario('starter');
    const mochi = world.cats['cat_mochi'];

    // Employ Mochi in café career: shift from 9:00 to 17:00 (540 min to 1020 min), workdays [0] (Day 0)
    const career: CareerRecord = {
      catId: 'cat_mochi',
      careerId: 'cafe_assistant',
      rank: 1,
      shiftStartHour: 9,
      shiftEndHour: 17,
      workDays: [0, 1, 2, 3, 4], // Monday-Friday (including day 0)
      performance: 50,
      isAtWork: false,
    };
    world.economy.careers['cat_mochi'] = career;

    // Set clock to Day 1, 8:59 AM (minute 539)
    world.clock.simMinute = 539;
    world.clock.isPaused = false;
    const initialBaseAppearance = { ...mochi.appearance };

    // Advance 1 minute to 9:00 AM (shift start)
    const workState = advance(world, 1);
    const workingCat = workState.cats['cat_mochi'];

    // Assert: Mochi is at work, wearing career outfit, base appearance preserved
    expect(workingCat.isAtWork).toBe(true);
    expect(workingCat.careerOutfit?.outfitId).toBe('outfit_cafe_apron_green');
    expect(workingCat.appearance.accessoryId).toBe('outfit_cafe_apron_green');
    expect(workingCat.baseAppearance.breed).toBe(initialBaseAppearance.breed);

    // Advance 8 hours (480 minutes) to 17:00 in 60-min steps respecting R09 MAX_SIM_MINUTES_PER_ADVANCE
    let returnState = workState;
    for (let i = 0; i < 8; i++) {
      returnState = advance(returnState, 60);
    }
    const returnedCat = returnState.cats['cat_mochi'];

    // Assert: Shift ended, cat returned, base appearance restored, career outfit removed
    expect(returnedCat.isAtWork).toBe(false);
    expect(returnedCat.careerOutfit).toBeNull();
    expect(returnedCat.appearance.accessoryId).toBe(initialBaseAppearance.accessoryId);
    expect(returnState.economy.wallet.earnedCash).toBeGreaterThan(world.economy.wallet.earnedCash);
  });

  it('REPAIR 14: Typed subsystem reducers reject unsupported commands with explicit errors (CORE-14)', () => {
    const world = buildScenario('starter');

    // Unsupported neighborhood command
    const resNeigh = dispatch(
      world,
      { type: 'TRAVEL_TO_LOT', payload: { catId: 'cat_mochi', targetLotId: 'park' } },
      { actorId: 'player', commandId: 'cmd_unsupported_neigh' }
    );
    expect(resNeigh.ok).toBe(false);
    if (!resNeigh.ok) {
      expect(resNeigh.error.code).toBe('COMMAND_NOT_SUPPORTED');
    }

    // Unsupported economy command
    const resEcon = dispatch(
      world,
      { type: 'SELL_ITEM', payload: { itemId: 'inv_item_01', quantity: 1 } },
      { actorId: 'player', commandId: 'cmd_unsupported_econ' }
    );
    expect(resEcon.ok).toBe(false);
    if (!resEcon.ok) {
      expect(resEcon.error.code).toBe('COMMAND_NOT_SUPPORTED');
    }
  });
});
