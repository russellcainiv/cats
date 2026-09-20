// tests/domain/lifecycle/composed_integration.test.ts
// End-to-end composed integration test suite: Social + Lifecycle domain subsystems.

import { describe, it, expect } from 'vitest';

// Import Social subsystem
import {
  reduceSocial,
  advanceSocial,
  pairKey,
} from '/Users/russell/.codex/worktrees/cats-social/Cats/src/domain/social/index';

// Import Lifecycle subsystem
import {
  reduceLifecycle,
  advanceLifecycle,
  executeBirth,
  executeHazardIntervention,
  executePlaceMemorial,
  SeededRng,
} from '../../../src/domain/lifecycle/index';

import { createTestWorldState, createTestCommandContext } from './harness';

function createComposedTestWorld(): any {
  const world: any = createTestWorldState();
  world.social = {
    recentInteractions: [],
    relationships: {},
    memories: {},
    inProgressActions: [],
    pairCooldowns: {},
    completedActionIds: [],
  };
  return world;
}

describe('Composed Social & Lifecycle Subsystem Integration', () => {
  it('End-to-End Cycle: Conception -> 3-day Gestation -> Birth -> Released Slots -> New Conception', () => {
    // 1. Initial State: 2 living adult cats in mutual love
    let world = createComposedTestWorld();
    world.clock.simMinute = 1000;
    // Set Seed 2: drawFloat(moo_moo_conception) is 0.1659 <= 0.25 (guarantees conception)
    world.rng = { seed: 2, counter: 0 };

    world.cats['cat_dam'].lifeStage = 'adult';
    world.cats['cat_dam'].needs = { hunger: 80, energy: 80, hygiene: 80, social: 80, fun: 80, bladder: 80, health: 90 } as any;
    world.cats['cat_sire'].lifeStage = 'adult';
    world.cats['cat_sire'].needs = { hunger: 80, energy: 80, hygiene: 80, social: 80, fun: 80, bladder: 80, health: 90 } as any;

    const pKey = pairKey('cat_sire', 'cat_dam');
    world.social.relationships[pKey] = {
      friendship: 80,
      romance: 90,
      isLove: true,
      isRival: false,
      isFriend: true,
      interactionCount: 5,
      lastInteractionSimMinute: 500,
    };

    expect(world.livingCatIds.length).toBe(2);
    expect(Object.keys(world.lifecycle.pregnancies).length).toBe(0);

    // 2. Sire suggests Moo-Moo to Dam
    const suggestRes = reduceSocial(
      world,
      { type: 'SUGGEST_MOO_MOO', payload: { initiatorId: 'cat_sire', partnerId: 'cat_dam' } },
      createTestCommandContext('cmd_moo_1')
    );
    expect(suggestRes.ok).toBe(true);
    world = suggestRes.state;

    // 3. Advance 10 simulation minutes in composed loop
    world.clock.simMinute += 10; // Minute 1010
    world = advanceSocial(world, 10);
    world = advanceLifecycle(world, 10);

    // Verify conception occurred
    const pregKeys = Object.keys(world.lifecycle.pregnancies);
    expect(pregKeys.length).toBe(1);
    const pregnancy = world.lifecycle.pregnancies[pregKeys[0]];
    expect(pregnancy.parentIds).toBeDefined();
    expect(pregnancy.parentIds[0]).toBe('cat_dam'); // gestating mother
    expect(pregnancy.parentIds[1]).toBe('cat_sire');
    expect(pregnancy.dueAtSimMinute).toBe(1010 + 4320); // 3 sim days
    expect(pregnancy.reservedSlots).toBeGreaterThanOrEqual(1);
    expect(world.cats['cat_dam'].isPregnant).toBe(true);

    const reservedSlots1 = pregnancy.reservedSlots;

    // 4. Advance 4320 simulation minutes (3 sim days) in canonical 30-minute steps
    const step = 30;
    const totalGestationSteps = 4320 / step; // 144 steps
    for (let i = 0; i < totalGestationSteps; i++) {
      world.clock.simMinute += step;
      world = advanceSocial(world, step);
      world = advanceLifecycle(world, step);
    }

    expect(world.clock.simMinute).toBe(1010 + 4320); // Exactly at due date: 5330
    // Pregnancy must NOT be cancelled during gestation
    expect(world.lifecycle.pregnancies[pregKeys[0]]).toBeDefined();
    expect(world.cats['cat_dam'].lifeStatus).toBe('living');

    // 5. Birth is triggered at due date
    const birthRes = executeBirth(
      world,
      { type: 'TRIGGER_BIRTH', payload: { pregnancyId: pregnancy.id, kittenNames: ['Kitten_A', 'Kitten_B', 'Kitten_C'] } },
      createTestCommandContext('cmd_birth_1')
    );
    expect(birthRes.ok).toBe(true);
    if (!birthRes.ok) return;
    world = birthRes.state;

    // Active pregnancy removed so reservations release exactly once
    expect(world.lifecycle.pregnancies[pregnancy.id]).toBeUndefined();
    expect(Object.keys(world.lifecycle.pregnancies).length).toBe(0);
    expect(world.cats['cat_dam'].isPregnant).toBe(false);

    // Total living count updated
    const expectedLiving = 2 + reservedSlots1;
    expect(world.livingCatIds.length).toBe(expectedLiving);

    // Verify kittens have genealogy and career outfit field preserved
    const damChildIds = world.cats['cat_dam'].family.childIds;
    expect(damChildIds.length).toBe(reservedSlots1);
    const firstKitten = world.cats[damChildIds[0]];
    expect(firstKitten.lifeStage).toBe('kitten');
    expect(firstKitten.careerOutfit).toBeNull();
    expect(firstKitten.motherId).toBe('cat_dam');
    expect(firstKitten.family.damId).toBe('cat_dam');

    // 6. Cats suggest Moo-Moo AGAIN (Available capacity: 8 - living > 0)
    // Cooldown expired
    world.clock.simMinute += 200;
    const suggestRes2 = reduceSocial(
      world,
      { type: 'SUGGEST_MOO_MOO', payload: { initiatorId: 'cat_sire', partnerId: 'cat_dam' } },
      createTestCommandContext('cmd_moo_2')
    );
    expect(suggestRes2.ok).toBe(true);
    world = suggestRes2.state;

    // Advance 10 simulation minutes
    world.clock.simMinute += 10;
    // Set seed for second conception
    world.rng = { seed: 14, counter: 0 }; // Seed 14 draws 0.1133 <= 0.25
    world = advanceSocial(world, 10);
    world = advanceLifecycle(world, 10);

    // New pregnancy conceived! No capacity leak from resolved previous birth!
    const newPregKeys = Object.keys(world.lifecycle.pregnancies);
    expect(newPregKeys.length).toBe(1);
    const newPreg = world.lifecycle.pregnancies[newPregKeys[0]];
    expect(newPreg.parentIds[0]).toBe('cat_dam');
    expect(newPreg.reservedSlots).toBeGreaterThanOrEqual(1);
    expect(world.livingCatIds.length + newPreg.reservedSlots).toBeLessThanOrEqual(8);
  });

  it('Enforces 8 Living + Reserved Capacity Invariant with Zero Conception Rolls at Capacity', () => {
    let world = createComposedTestWorld();
    world.clock.simMinute = 1000;
    world.rng = { seed: 2, counter: 0 };

    // Fill household with 8 living cats
    for (let i = 1; i <= 6; i++) {
      const extraId = `cat_filler_${i}`;
      world.cats[extraId] = {
        ...world.cats['cat_dam'],
        id: extraId,
        name: `Filler ${i}`,
      };
      world.livingCatIds.push(extraId);
    }
    expect(world.livingCatIds.length).toBe(8);

    const pKey = pairKey('cat_sire', 'cat_dam');
    world.social.relationships[pKey] = {
      friendship: 80,
      romance: 90,
      isLove: true,
      isRival: false,
      isFriend: true,
      interactionCount: 5,
      lastInteractionSimMinute: 500,
    };

    const startRes = reduceSocial(
      world,
      { type: 'SUGGEST_MOO_MOO', payload: { initiatorId: 'cat_sire', partnerId: 'cat_dam' } },
      createTestCommandContext('cmd_cap_test')
    );
    expect(startRes.ok).toBe(true);
    world = startRes.state;

    const rngBefore = world.rng.counter;
    world.clock.simMinute += 10;
    world = advanceSocial(world, 10);
    world = advanceLifecycle(world, 10);

    // Moo-Moo completes romance but makes ZERO conception rolls
    expect(world.rng.counter).toBe(rngBefore);
    expect(Object.keys(world.lifecycle.pregnancies).length).toBe(0);
    expect(world.events.some((e) => e.type === 'MOO_MOO_COMPLETED')).toBe(true);
  });

  it('Enforces Permanent Death: Deceased Cats Cannot Reproduce, Heal, or Take Living Slots', () => {
    let world = createComposedTestWorld();
    world.clock.simMinute = 1000;

    // Mark cat_dam deceased
    world.cats['cat_dam'].lifeStatus = 'deceased';
    world.livingCatIds = world.livingCatIds.filter((id) => id !== 'cat_dam');

    // 1. Attempting Moo-Moo with deceased cat fails
    const mooRes = reduceSocial(
      world,
      { type: 'SUGGEST_MOO_MOO', payload: { initiatorId: 'cat_sire', partnerId: 'cat_dam' } },
      createTestCommandContext('cmd_ghost_moo')
    );
    expect(mooRes.ok).toBe(false);

    // 2. Attempting health intervention on deceased cat fails with CAT_NOT_ALIVE
    const cureRes = executeHazardIntervention(
      world,
      { type: 'INTERVENE_HAZARD', payload: { catId: 'cat_dam', treatmentType: 'care' } },
      createTestCommandContext('cmd_ghost_cure')
    );
    expect(cureRes.ok).toBe(false);
    expect(cureRes.error?.code).toBe('CAT_NOT_ALIVE');

    // 3. Deceased cat does NOT occupy living capacity
    expect(world.livingCatIds.includes('cat_dam')).toBe(false);
  });

  it('Action Interruption: Redirecting Cat Clears Paired Action Without Offscreen Completion', () => {
    let world = createComposedTestWorld();
    world.clock.simMinute = 1000;

    const pKey = pairKey('cat_sire', 'cat_dam');
    world.social.relationships[pKey] = {
      friendship: 80,
      romance: 90,
      isLove: true,
      isRival: false,
      isFriend: true,
      interactionCount: 5,
      lastInteractionSimMinute: 500,
    };

    const startRes = reduceSocial(
      world,
      { type: 'SUGGEST_MOO_MOO', payload: { initiatorId: 'cat_sire', partnerId: 'cat_dam' } },
      createTestCommandContext('cmd_interrupt')
    );
    expect(startRes.ok).toBe(true);
    world = startRes.state;

    // External redirection: cat_sire is commanded to eat kibble
    world.cats['cat_sire'].currentAction = {
      id: 'act_eat_food',
      type: 'eat',
      progressMinutes: 0,
      totalMinutes: 15,
      interruptible: true,
    } as any;

    world.clock.simMinute += 10;
    world = advanceSocial(world, 10);
    world = advanceLifecycle(world, 10);

    // Paired Moo-Moo cancelled and cleared
    expect(world.social.inProgressActions.length).toBe(0);
    expect(world.cats['cat_dam'].currentAction).toBeNull();
    expect(Object.keys(world.lifecycle.pregnancies).length).toBe(0);
    expect(world.events.some((e) => e.type === 'MOO_MOO_CANCELLED')).toBe(true);
  });

  it('Deterministic Replay: Identical Seed and Commands Yield Identical Output', () => {
    const runSimulation = () => {
      let state = createComposedTestWorld();
      state.clock.simMinute = 1000;
      state.rng = { seed: 42, counter: 0 };

      const pKey = pairKey('cat_sire', 'cat_dam');
      state.social.relationships[pKey] = {
        friendship: 80,
        romance: 90,
        isLove: true,
        isRival: false,
        isFriend: true,
        interactionCount: 5,
        lastInteractionSimMinute: 500,
      };

      const res1 = reduceSocial(
        state,
        { type: 'SUGGEST_MOO_MOO', payload: { initiatorId: 'cat_sire', partnerId: 'cat_dam' } },
        createTestCommandContext({ commandId: 'c1' })
      );

      let s = res1.state;
      s.clock.simMinute += 10;
      s = advanceSocial(s, 10);
      s = advanceLifecycle(s, 10);

      return {
        state: s,
        events: s.events,
      };
    };

    const runA = runSimulation();
    const runB = runSimulation();

    expect(JSON.stringify(runA.state)).toBe(JSON.stringify(runB.state));
    expect(JSON.stringify(runA.events)).toBe(JSON.stringify(runB.events));
  });
});
