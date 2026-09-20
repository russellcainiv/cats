// tests/domain/lifecycle/regression_remediation.test.ts
// Regression verification for review defects REPRO-01, REPRO-05, REPRO-06, REPRO-07, REPRO-08.

import { describe, it, expect } from 'vitest';
import { createTestWorldState, createTestCommandContext } from './harness';
import {
  advanceLifecycle,
  processGestationTick,
  executeBirth,
  processHazardsTick,
  processGhostTick,
  SeededRng,
  nextRng,
  PregnancyRecord,
  MemorialRecord,
} from '../../../src/domain/lifecycle/index';

describe('Lifecycle Defect Remediation & Invariants', () => {
  it('REPRO-01: Pregnancy schema compatibility with parentIds and motherId/fatherId', () => {
    const world = createTestWorldState();
    const pregnancy: PregnancyRecord = {
      id: 'preg_canonical_1',
      parentIds: ['cat_dam', 'cat_sire'],
      startedAtSimMinute: 1000,
      dueAtSimMinute: 5320,
      reservedSlots: 2,
      conceptionEventId: 'evt_conc_1',
      // backward compat aliases:
      motherId: 'cat_dam',
      fatherId: 'cat_sire',
      damId: 'cat_dam',
      sireId: 'cat_sire',
      litterSize: 2,
      resolved: false,
    };
    world.lifecycle.pregnancies['preg_canonical_1'] = pregnancy;

    // 1. Tick gestation - dam is alive so pregnancy must NOT be cancelled
    const { state: tickState, events: tickEvents } = processGestationTick(world, 10);
    expect(tickEvents.find(e => e.type === 'PREGNANCY_CANCELLED')).toBeUndefined();
    expect(tickState.lifecycle.pregnancies['preg_canonical_1']).toBeDefined();

    // 2. Trigger birth - successfully delivers kittens and removes active pregnancy
    const birthRes = executeBirth(
      tickState,
      { type: 'TRIGGER_BIRTH', payload: { pregnancyId: 'preg_canonical_1', kittenNames: ['K1', 'K2'] } },
      createTestCommandContext('cmd_birth')
    );
    expect(birthRes.ok).toBe(true);
    if (!birthRes.ok) return;

    expect(birthRes.state.lifecycle.pregnancies['preg_canonical_1']).toBeUndefined();
    expect(birthRes.state.livingCatIds.length).toBe(4);

    const dam = birthRes.state.cats['cat_dam'];
    expect(dam.family.childIds.length).toBe(2);
    const kitten = birthRes.state.cats[dam.family.childIds[0]];
    expect(kitten.motherId).toBe('cat_dam');
    expect(kitten.family.damId).toBe('cat_dam');
  });

  it('REPRO-05: Immutability - Ghost tick never mutates input memorial record in-place', () => {
    const world = createTestWorldState();
    const memorial: MemorialRecord = {
      id: 'mem_immut_1',
      deceasedCatId: 'cat_deceased',
      catName: 'OldTimer',
      appearance: { coatColor: 'orange', coatPattern: 'tabby', eyeColor: 'green' },
      traits: ['lazy'],
      ageAtDeathMinutes: 216000,
      causeOfDeath: 'old_age',
      deceasedAtSimMinute: 500,
      tombstonePosition: { lotId: 'lot_home', x: 2, y: 2 },
      ghostVisits: [],
    };
    world.lifecycle.memorials['mem_immut_1'] = memorial;
    world.clock.simMinute = 1440;
    world.lifecycle.lastGhostCheckNight = -1;
    world.rng.seed = 2; // guaranteed ghost spawn

    // Freeze or record length before tick
    const visitsLengthBefore = memorial.ghostVisits.length;

    const { state: nextState } = processGhostTick(world, 10);

    // Input memorial object must NOT be mutated in-place
    expect(memorial.ghostVisits.length).toBe(visitsLengthBefore);
    expect(memorial.ghostVisits.length).toBe(0);

    // Output state memorial has the recorded visit
    expect(nextState.lifecycle.memorials['mem_immut_1'].ghostVisits.length).toBe(1);
    expect(nextState.lifecycle.ghosts.length).toBe(1);
  });

  it('REPRO-06: Hazard warning timer invariance under small vs large fixed ticks', () => {
    // Scenario A: 13 ticks of 10 minutes (total 130 min)
    const worldA = createTestWorldState();
    worldA.clock.simMinute = 1000;
    worldA.cats['cat_dam'].needs.hunger = 0;

    let stateA = worldA;
    for (let i = 0; i < 13; i++) {
      stateA.clock.simMinute += 10;
      stateA = advanceLifecycle(stateA, 10);
    }
    const statusA = stateA.cats['cat_dam'].lifeStatus;

    // Scenario B: 1 tick of 130 minutes
    const worldB = createTestWorldState();
    worldB.clock.simMinute = 1000;
    worldB.cats['cat_dam'].needs.hunger = 0;

    worldB.clock.simMinute = 1130;
    const stateB = advanceLifecycle(worldB, 130);
    const statusB = stateB.cats['cat_dam'].lifeStatus;

    // Both must reach the identical deceased outcome
    expect(statusA).toBe('deceased');
    expect(statusB).toBe('deceased');
  });

  it('REPRO-07: advanceLifecycle does not increment state.clock.simMinute', () => {
    const world = createTestWorldState();
    world.clock.simMinute = 500;

    const nextState = advanceLifecycle(world, 15);
    expect(nextState.clock.simMinute).toBe(500);
  });

  it('REPRO-08: Canonical SeededRng produces exact deterministic floats and serialization', () => {
    const rngState = { seed: 12345, counter: 0 };
    const seeded = new SeededRng(12345);
    const expectedVal = seeded.drawFloat('test', 0);

    const [actualVal, updatedRng] = nextRng(rngState, 'test', 0);
    expect(actualVal).toBe(expectedVal);
    expect(updatedRng.counter).toBe(1);
    expect(updatedRng.serializedState).toBeDefined();

    // Verify restore
    const restored = SeededRng.deserialize(updatedRng.serializedState!);
    expect(restored.drawCount).toBe(1);
    expect(restored.seed).toBe(12345);
  });
});
