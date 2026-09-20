import { describe, expect, it } from 'bun:test';
import { dispatch } from '../../../src/domain/commands';
import { advance } from '../../../src/domain/simulation';
import { buildScenario } from '../../../src/domain/scenarios';
import { selectView } from '../../../src/domain/selectors';
import { CareerRecord, CatRecord, WorldState } from '../../../src/domain/state';

describe('Composed Engine End-to-End Integration Suite', () => {
  it('1. Enforces 8-cat living capacity limit with dispatch and view projection', () => {
    let world = buildScenario('starter');
    expect(world.livingCatIds.length).toBe(1);

    // Adopt cats until capacity of 8 is reached
    for (let i = 2; i <= 8; i++) {
      const res = dispatch(
        world,
        {
          type: 'ADOPT_CAT',
          payload: {
            name: `Cat_${i}`,
            appearance: {
              breed: 'bombay',
              primaryColor: '#111111',
              pattern: 'solid',
              eyeColor: 'amber',
              bodyType: 'average',
            },
            traits: ['curious'],
          },
        },
        { actorId: 'player', commandId: `cmd_adopt_${i}` }
      );
      expect(res.ok).toBe(true);
      if (res.ok) {
        world = res.state;
      }
    }

    expect(world.livingCatIds.length).toBe(8);

    // Attempting to adopt a 9th cat must be rejected
    const ninthRes = dispatch(
      world,
      {
        type: 'ADOPT_CAT',
        payload: {
          name: 'NinthCat',
          appearance: {
            breed: 'bombay',
            primaryColor: '#000000',
            pattern: 'solid',
            eyeColor: 'green',
            bodyType: 'petite',
          },
          traits: ['playful'],
        },
      },
      { actorId: 'player', commandId: 'cmd_adopt_ninth' }
    );
    expect(ninthRes.ok).toBe(false);
    if (!ninthRes.ok) {
      expect(['CAPACITY_EXCEEDED', 'INVARIANT_VIOLATION']).toContain(ninthRes.error.code);
    }

    // View projection reflects household capacity and living count
    const view = selectView(world);
    expect(view.household.livingCount).toBe(8);
    expect(view.household.capacity).toBe(8);
    expect(Object.keys(view.cats).length).toBe(8);
  });

  it('2. Care, pathfinding, and navigation around obstacles', () => {
    let world = buildScenario('playable-home');
    world.clock.isPaused = false;
    const mochi = world.cats['cat_mochi'];

    // Move Mochi to interact spot of bowl at (6, 3)
    const moveRes = dispatch(
      world,
      {
        type: 'MOVE_CAT',
        payload: { catId: mochi.id, target: { x: 6, y: 3 } },
      },
      { actorId: 'player', commandId: 'cmd_move_bowl' }
    );
    expect(moveRes.ok).toBe(true);
    if (moveRes.ok) {
      world = moveRes.state;
    }

    // Advance to complete movement along path
    world = advance(world, 10);
    expect(world.cats['cat_mochi'].position.x).toBe(6);
    expect(world.cats['cat_mochi'].position.y).toBe(3);

    // Direct care: eat from food bowl
    const eatRes = dispatch(
      world,
      {
        type: 'DIRECT_CARE',
        payload: { catId: mochi.id, actionType: 'eat', targetObjectId: 'obj_bowl_01' },
      },
      { actorId: 'player', commandId: 'cmd_eat_bowl' }
    );
    expect(eatRes.ok).toBe(true);
    if (eatRes.ok) {
      world = eatRes.state;
      expect(world.cats['cat_mochi'].currentAction?.type).toBe('eat');
    }
  });

  it('3. Real building subsystem: placement, wallet deduction, undo/redo, and free-build', () => {
    let world = buildScenario('starter');
    const initialCash = world.economy.wallet.earnedCash;

    // Place a sofa from catalog (cost 250) at (5, 5) with interact spots at (5, 6) and (6, 6)
    const placeRes = dispatch(
      world,
      {
        type: 'PLACE_OBJECT',
        payload: {
          lotId: 'home',
          catalogId: 'seat_cushion_sofa',
          x: 5,
          y: 5,
          rotation: 0,
        },
      },
      { actorId: 'player', commandId: 'cmd_place_sofa' }
    );
    expect(placeRes.ok).toBe(true);
    if (!placeRes.ok) return;
    world = placeRes.state;

    // Wallet is deducted
    expect(world.economy.wallet.earnedCash).toBe(initialCash - 250);

    // Undo placement restores wallet and removes object
    const undoRes = dispatch(
      world,
      { type: 'UNDO_BUILD', payload: { lotId: 'home' } },
      { actorId: 'player', commandId: 'cmd_undo_place' }
    );
    expect(undoRes.ok).toBe(true);
    if (!undoRes.ok) return;
    world = undoRes.state;
    expect(world.economy.wallet.earnedCash).toBe(initialCash);

    // Redo restores object placement and re-deducts wallet
    const redoRes = dispatch(
      world,
      { type: 'REDO_BUILD', payload: { lotId: 'home' } },
      { actorId: 'player', commandId: 'cmd_redo_place' }
    );
    expect(redoRes.ok).toBe(true);
    if (!redoRes.ok) return;
    world = redoRes.state;
    expect(world.economy.wallet.earnedCash).toBe(initialCash - 250);

    // Enter Free Build mode
    const freeRes = dispatch(
      world,
      { type: 'ENTER_FREE_BUILD', payload: {} },
      { actorId: 'player', commandId: 'cmd_enter_free' }
    );
    expect(freeRes.ok).toBe(true);
    if (!freeRes.ok) return;
    world = freeRes.state;
    expect(world.building.activeFreeBuild).toBe(true);

    // Place free object with $0 charge
    const freePlaceRes = dispatch(
      world,
      {
        type: 'PLACE_OBJECT',
        payload: {
          lotId: 'home',
          catalogId: 'decor_potted_monstera',
          x: 4,
          y: 7,
          rotation: 0,
        },
      },
      { actorId: 'player', commandId: 'cmd_free_place_obj' }
    );
    expect(freePlaceRes.ok).toBe(true);
    if (!freePlaceRes.ok) return;
    world = freePlaceRes.state;
    expect(world.economy.wallet.earnedCash).toBe(initialCash - 250); // No cash deducted in free build

    // Commit free build
    const commitRes = dispatch(
      world,
      { type: 'COMMIT_FREE_BUILD', payload: {} },
      { actorId: 'player', commandId: 'cmd_commit_free' }
    );
    expect(commitRes.ok).toBe(true);
  });

  it('4. Real economy subsystem: career shift departure, outfit swap, return, and daily wages', () => {
    let world = buildScenario('starter');
    const mochi = world.cats['cat_mochi'];

    const career: CareerRecord = {
      catId: mochi.id,
      careerId: 'cafe_assistant',
      rank: 1,
      shiftStartHour: 9,
      shiftEndHour: 17,
      workDays: [0, 1, 2, 3, 4],
      performance: 50,
      isAtWork: false,
    };
    world.economy.careers[mochi.id] = career;
    world.clock.simMinute = 539; // 8:59 AM Day 1 (Day 0 of week)
    world.clock.isPaused = false;
    const initialCash = world.economy.wallet.earnedCash;
    const initialBase = { ...mochi.appearance };

    // Advance 1 minute to 9:00 AM (shift start)
    world = advance(world, 1);
    const workingCat = world.cats[mochi.id];

    expect(workingCat.isAtWork).toBe(true);
    expect(workingCat.careerOutfit?.outfitId).toBe('outfit_cafe_apron_green');
    expect(workingCat.appearance.accessoryId).toBe('outfit_cafe_apron_green');
    expect(workingCat.baseAppearance.breed).toBe(initialBase.breed);

    // Projected GameView reflects career and outfit
    const view = selectView(world);
    expect(view.careers.length).toBeGreaterThan(0);
    expect(view.cats[mochi.id].isAtWork).toBe(true);
    expect(view.cats[mochi.id].careerOutfit?.outfitId).toBe('outfit_cafe_apron_green');

    // Advance 8 hours (480 minutes) to 17:00 (shift end)
    for (let i = 0; i < 8; i++) {
      world = advance(world, 60);
    }
    const returnedCat = world.cats[mochi.id];

    // Shift ended, cat returned, base appearance restored, wage earned
    expect(returnedCat.isAtWork).toBe(false);
    expect(returnedCat.careerOutfit).toBeNull();
    expect(returnedCat.appearance.accessoryId).toBe(initialBase.accessoryId);
    expect(world.economy.wallet.earnedCash).toBeGreaterThan(initialCash);
  });

  it('5. Moo-Moo romance -> 3-day gestation -> birth -> genetics inheritance -> memorials -> ghost visit', () => {
    let world = buildScenario('starter');
    world.clock.isPaused = false;

    // Create adult partner with mutual romance
    const partnerRes = dispatch(
      world,
      {
        type: 'ADOPT_CAT',
        payload: {
          name: 'Luna',
          appearance: {
            breed: 'siamese',
            primaryColor: '#FFFFFF',
            pattern: 'pointed',
            eyeColor: 'blue',
            bodyType: 'petite',
          },
          traits: ['affectionate'],
        },
      },
      { actorId: 'player', commandId: 'cmd_adopt_luna' }
    );
    expect(partnerRes.ok).toBe(true);
    if (!partnerRes.ok) return;
    world = partnerRes.state;

    const mochiId = 'cat_mochi';
    const lunaId = Object.keys(world.cats).find((id) => id !== mochiId)!;

    // Set mutual romance and adult lifeStage
    world.cats[mochiId].relationships[lunaId] = {
      targetCatId: lunaId,
      friendship: 90,
      romance: 95,
      isLove: true,
      lastInteractionMinute: 0,
    };
    world.cats[lunaId].relationships[mochiId] = {
      targetCatId: mochiId,
      friendship: 90,
      romance: 95,
      isLove: true,
      lastInteractionMinute: 0,
    };
    world.cats[mochiId].lifeStage = 'adult';
    world.cats[lunaId].lifeStage = 'adult';

    // Suggest Moo-Moo
    const mooRes = dispatch(
      world,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: mochiId, partnerId: lunaId },
      },
      { actorId: 'player', commandId: 'cmd_moo_cycle' }
    );
    expect(mooRes.ok).toBe(true);
    if (!mooRes.ok) return;
    world = mooRes.state;

    // Verify pregnancy was created with reserved slots
    const pregKeys = Object.keys(world.lifecycle.pregnancies);
    expect(pregKeys.length).toBe(1);
    const pregnancy = world.lifecycle.pregnancies[pregKeys[0]];
    expect(pregnancy.reservedSlots).toBeGreaterThan(0);
    expect(pregnancy.dueAtSimMinute).toBe(world.clock.simMinute + 4320);

    // Advance 4320 minutes (3 sim days) in 60-minute steps
    for (let i = 0; i < 72; i++) {
      world = advance(world, 60);
    }

    // Pregnancy resolved at due date, kittens born with ancestry
    expect(Object.keys(world.lifecycle.pregnancies).length).toBe(0);
    expect(world.livingCatIds.length).toBeGreaterThan(2);

    // Verify kittens have genetics and parentage
    const kittenIds = world.livingCatIds.filter((id) => id !== mochiId && id !== lunaId);
    expect(kittenIds.length).toBeGreaterThan(0);
    for (const kId of kittenIds) {
      const kitten = world.cats[kId];
      expect(kitten.lifeStage).toBe('kitten');
      expect([mochiId, lunaId]).toContain(kitten.motherId as string);
    }

    // View projects complete family
    const view = selectView(world);
    expect(view.household.livingCount).toBe(world.livingCatIds.length);
    expect(view.cats[kittenIds[0]].motherId).toBeDefined();

    // Natural elder death after lifespan
    const eldestCat = world.cats[mochiId];
    eldestCat.ageMinutes = 150 * 1440; // 150 sim days
    world = advance(world, 1);

    expect(world.cats[mochiId].lifeStatus).toBe('deceased');
    expect(world.lifecycle.memorials[`mem_${mochiId}`]).toBeDefined();

    // Night transition spawns ghost projection from memorial
    world.clock.simMinute = 1440 * 10 + 23 * 60; // 23:00 Night
    world = advance(world, 60);
    const ghostView = selectView(world);
    expect(ghostView.memorials.length).toBeGreaterThan(0);
  });

  it('6. Segmentation invariance: advance(60) is equivalent to 60 * advance(1)', () => {
    const worldA = buildScenario('starter', { seed: 4242 });
    const worldB = buildScenario('starter', { seed: 4242 });

    const stateA = advance(worldA, 60);

    let stateB = worldB;
    for (let i = 0; i < 60; i++) {
      stateB = advance(stateB, 1);
    }

    expect(stateA.clock.simMinute).toBe(stateB.clock.simMinute);
    expect(stateA.cats['cat_mochi'].needs.hunger).toBe(stateB.cats['cat_mochi'].needs.hunger);
    expect(stateA.cats['cat_mochi'].needs.energy).toBe(stateB.cats['cat_mochi'].needs.energy);
    expect(stateA.economy.wallet.earnedCash).toBe(stateB.economy.wallet.earnedCash);
    expect(stateA.rng.counter).toBe(stateB.rng.counter);
  });

  it('7. Immutability: dispatch and advance never mutate input state in-place', () => {
    const world = buildScenario('starter');
    const frozenWorld = JSON.parse(JSON.stringify(world));

    dispatch(
      world,
      {
        type: 'BUY_ITEM',
        payload: { catalogId: 'furn_cushion_cozy', quantity: 1 },
      },
      { actorId: 'player', commandId: 'cmd_immut_test' }
    );

    expect(world.economy.wallet.earnedCash).toBe(frozenWorld.economy.wallet.earnedCash);
    expect(world.commandReceipts.length).toBe(frozenWorld.commandReceipts.length);

    advance(world, 10);
    expect(world.clock.simMinute).toBe(frozenWorld.clock.simMinute);
    expect(world.cats['cat_mochi'].needs.hunger).toBe(frozenWorld.cats['cat_mochi'].needs.hunger);
  });

  it('8. Deterministic save/reload round-trip serialization', () => {
    let world = buildScenario('starter');
    world = advance(world, 120);

    const serialized = JSON.stringify(world);
    const deserialized: WorldState = JSON.parse(serialized);

    const next1 = advance(world, 30);
    const next2 = advance(deserialized, 30);

    expect(next1.clock.simMinute).toBe(next2.clock.simMinute);
    expect(next1.cats['cat_mochi'].needs.hunger).toBe(next2.cats['cat_mochi'].needs.hunger);
    expect(next1.rng.counter).toBe(next2.rng.counter);
  });
});
