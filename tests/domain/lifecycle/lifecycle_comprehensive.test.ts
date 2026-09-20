// tests/domain/lifecycle/lifecycle_comprehensive.test.ts
import { describe, it, expect } from 'vitest';
import {
  createTestWorldState,
  createTestCommandContext,
} from './harness';

import {
  reduceLifecycle,
  advanceLifecycle,
  isLifecycleCommand,
  initLifecycleState,
  LIFESPAN_TOTAL_MINUTES,
  PregnancyRecord,
  MemorialRecord,
} from '../../../src/domain/lifecycle';

describe('Comprehensive Lifecycle Domain Test Suite', () => {
  it('verifies initLifecycleState produces default empty state', () => {
    const initialState = initLifecycleState();
    expect(initialState.pregnancies).toEqual({});
    expect(initialState.memorials).toEqual({});
    expect(initialState.ghosts).toEqual([]);
    expect(initialState.lastGhostCheckNight).toBe(-1);
  });

  it('verifies isLifecycleCommand type discriminator', () => {
    expect(isLifecycleCommand({ type: 'TRIGGER_BIRTH', payload: { pregnancyId: 'p1' } })).toBe(true);
    expect(isLifecycleCommand({ type: 'INTERVENE_HAZARD', payload: { catId: 'c1' } })).toBe(true);
    expect(isLifecycleCommand({ type: 'PLACE_MEMORIAL', payload: { deceasedCatId: 'c1', lotId: 'l1', x: 0, y: 0 } })).toBe(true);
    expect(isLifecycleCommand({ type: 'DISMISS_GHOST', payload: { memorialId: 'm1' } })).toBe(true);
    expect(isLifecycleCommand({ type: 'CREATE_CAT', payload: {} as any })).toBe(false);
  });

  it('enforces 8-cat capacity invariant on birth when living + reserved > 8', () => {
    const world = createTestWorldState();
    // Fill household to 7 cats
    for (let i = 1; i <= 5; i++) {
      const id = `cat_extra_${i}`;
      world.cats[id] = {
        id,
        householdId: world.householdId,
        name: `Extra ${i}`,
        appearance: { coatColor: 'black', coatPattern: 'solid', eyeColor: 'yellow' },
        traits: ['curious'],
        lifeStage: 'adult',
        ageDays: 50,
        ageMinutes: 50 * 1440,
        lifeStatus: 'living',
        needs: { hunger: 80, energy: 80, hygiene: 80, social: 80, fun: 80, bladder: 80 },
        skills: { hunting: 0, climbing: 0, socializing: 0, charisma: 0 },
        position: { lotId: 'lot_home', x: 0, y: 0 },
        currentAction: null,
        family: { sireId: null, damId: null, childIds: [], generation: 1 },
      };
      world.livingCatIds.push(id);
    }

    expect(world.livingCatIds.length).toBe(7);

    // Pregnancy with litter size 2 (7 + 2 = 9 > 8)
    const preg: PregnancyRecord = {
      id: 'preg_overflow',
      damId: 'cat_dam',
      sireId: 'cat_sire',
      conceptionSimMinute: 0,
      dueSimMinute: 4320,
      litterSize: 2,
      resolved: false,
    };
    world.lifecycle.pregnancies['preg_overflow'] = preg;
    world.clock.simMinute = 4320;

    const res = reduceLifecycle(
      world,
      { type: 'TRIGGER_BIRTH', payload: { pregnancyId: 'preg_overflow' } },
      createTestCommandContext()
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('CAPACITY_EXCEEDED');
    }
  });

  it('does not advance simulation time or age when simulation is paused', () => {
    const world = createTestWorldState();
    world.clock.isPaused = true;
    const initialSimMin = world.clock.simMinute;
    const initialAge = world.cats['cat_dam'].ageMinutes;

    const nextState = advanceLifecycle(world, 100);

    expect(nextState.clock.simMinute).toBe(initialSimMin);
    expect(nextState.cats['cat_dam'].ageMinutes).toBe(initialAge);
  });

  it('advances age and stages during active sim time, triggering natural old age death once at 150 days', () => {
    const world = createTestWorldState();
    world.cats['cat_dam'].ageMinutes = LIFESPAN_TOTAL_MINUTES - 50;

    // Advance 100 minutes
    const nextState = advanceLifecycle(world, 100);

    expect(nextState.cats['cat_dam'].lifeStatus).toBe('deceased');
    expect(nextState.cats['cat_dam'].causeOfDeath).toBe('old_age');

    // Repeated ticks on deceased cat do not trigger duplicate death events
    const repeatedState = advanceLifecycle(nextState, 100);
    const deathEvents = repeatedState.events.filter(e => e.type === 'CAT_DIED' && e.actorIds.includes('cat_dam'));
    expect(deathEvents.length).toBe(1);
  });

  it('handles hazard warnings and allows timely intervention via reduceLifecycle', () => {
    const world = createTestWorldState();
    world.cats['cat_dam'].needs.hunger = 0;

    // Tick to trigger warning
    const stateWithWarning = advanceLifecycle(world, 10);
    expect(stateWithWarning.cats['cat_dam'].health?.warningIssued).toBe(true);

    // Intervene
    const res = reduceLifecycle(
      stateWithWarning,
      { type: 'INTERVENE_HAZARD', payload: { catId: 'cat_dam', treatmentType: 'care' } },
      createTestCommandContext()
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.state.cats['cat_dam'].health?.warningIssued).toBe(false);
    expect(res.state.cats['cat_dam'].needs.hunger).toBeGreaterThan(0);
  });

  it('handles final cat death retaining estate and emitting final death event', () => {
    const world = createTestWorldState();
    world.livingCatIds = ['cat_dam'];
    delete world.cats['cat_sire'];

    world.cats['cat_dam'].ageMinutes = LIFESPAN_TOTAL_MINUTES - 10;

    const endState = advanceLifecycle(world, 20);

    expect(endState.livingCatIds.length).toBe(0);
    expect(endState.events.some(e => e.type === 'FINAL_CAT_DIED')).toBe(true);
    expect(Object.keys(endState.lifecycle.memorials).length).toBe(1);
  });

  it('handles memorial placement, seeded ghost visits, and ghost dismissal', () => {
    let world = createTestWorldState();
    const mem: MemorialRecord = {
      id: 'mem_cat1',
      deceasedCatId: 'cat_dead1',
      catName: 'OldTimer',
      appearance: { coatColor: 'grey', coatPattern: 'tabby', eyeColor: 'amber' },
      traits: ['lazy'],
      ageAtDeathMinutes: 216000,
      causeOfDeath: 'old_age',
      deceasedAtSimMinute: 100,
      tombstonePosition: { lotId: 'lot_home', x: 1, y: 1 },
      ghostVisits: [],
    };
    world.lifecycle.memorials['mem_cat1'] = mem;

    // Place memorial
    const placeRes = reduceLifecycle(
      world,
      { type: 'PLACE_MEMORIAL', payload: { deceasedCatId: 'cat_dead1', lotId: 'lot_home', x: 5, y: 5 } },
      createTestCommandContext()
    );
    expect(placeRes.ok).toBe(true);
    if (!placeRes.ok) return;
    world = placeRes.state;

    expect(world.lifecycle.memorials['mem_cat1'].tombstonePosition).toEqual({ lotId: 'lot_home', x: 5, y: 5 });

    // Advance clock to end-of-step 1445 (crossing midnight 1440) and set seed to 2
    world.clock.simMinute = 1445;
    world.lifecycle.lastGhostCheckNight = -1;
    world.rng.seed = 2;

    world = advanceLifecycle(world, 10);
    expect(world.lifecycle.ghosts.length).toBe(1);

    // Ghost is projection only - does not affect living slots
    expect(world.livingCatIds.includes('cat_dead1')).toBe(false);

    // Dismiss ghost
    const dismissRes = reduceLifecycle(
      world,
      { type: 'DISMISS_GHOST', payload: { memorialId: 'mem_cat1' } },
      createTestCommandContext()
    );
    expect(dismissRes.ok).toBe(true);
    if (!dismissRes.ok) return;

    expect(dismissRes.state.lifecycle.ghosts.length).toBe(0);
  });
});
