import { describe, expect, it } from 'vitest';
import { dispatch } from '../../../src/domain/commands';
import { buildScenario } from '../../../src/domain/scenarios';
import { advance } from '../../../src/domain/simulation';

describe('Moo-Moo Romance, Mutual Readiness, and Pregnancy Capacity', () => {
  it('declines proposal and consumes ZERO random rolls when partners lack mutual love (R16, R17)', () => {
    const state = buildScenario('moo-moo-readiness');
    // Break mutual love: set Wasabi romance low
    state.cats['cat_wasabi'].relationships['cat_mochi'].romance = 30;
    state.cats['cat_wasabi'].relationships['cat_mochi'].isLove = false;

    const initialDrawCount = state.rng.counter;

    const res = dispatch(
      state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat_mochi', partnerId: 'cat_wasabi' },
      },
      { actorId: 'player', commandId: 'cmd_declined_moomoo' }
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.events.some((e) => e.type === 'MOO_MOO_DECLINED')).toBe(true);
      // CRITICAL: Declined proposal consumes zero random rolls!
      expect(res.state.rng.counter).toBe(initialDrawCount);
      // No pregnancy created
      expect(Object.keys(res.state.lifecycle.pregnancies).length).toBe(0);
    }
  });

  it('declines proposal if either cat is not in adult lifeStage', () => {
    const state = buildScenario('moo-moo-readiness');
    // Set Mochi as adolescent
    state.cats['cat_mochi'].lifeStage = 'adolescent';

    const res = dispatch(
      state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat_mochi', partnerId: 'cat_wasabi' },
      },
      { actorId: 'player', commandId: 'cmd_adolescent_moomoo' }
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.events.some((e) => e.type === 'MOO_MOO_DECLINED')).toBe(true);
      expect(res.events[0].payload.reason).toContain('Must be adult');
    }
  });

  it('declines proposal if either partner is exhausted or unhappy', () => {
    const state = buildScenario('moo-moo-readiness');
    // Wasabi is exhausted
    state.cats['cat_wasabi'].needs.energy = 15;

    const res = dispatch(
      state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat_mochi', partnerId: 'cat_wasabi' },
      },
      { actorId: 'player', commandId: 'cmd_tired_moomoo' }
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.events.some((e) => e.type === 'MOO_MOO_DECLINED')).toBe(true);
      expect(res.events[0].payload.reason).toContain('not in the mood');
    }
  });

  it('completes romantic action at 8-cat capacity without initiating a new pregnancy (R21)', () => {
    const state = buildScenario('moo-moo-readiness');
    // Artificially fill household to 8 living cats
    for (let i = 3; i <= 8; i++) {
      const extraId = `cat_extra_${i}`;
      state.cats[extraId] = {
        ...state.cats['cat_mochi'],
        id: extraId,
        name: `Extra ${i}`,
      };
      state.livingCatIds.push(extraId);
    }
    expect(state.livingCatIds.length).toBe(8);

    const initialDrawCount = state.rng.counter;

    const res = dispatch(
      state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat_mochi', partnerId: 'cat_wasabi' },
      },
      { actorId: 'player', commandId: 'cmd_capacity_moomoo' }
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.events.some((e) => e.type === 'MOO_MOO_COMPLETED')).toBe(true);
      expect(res.events.some((e) => e.type === 'MOO_MOO_AT_CAPACITY')).toBe(true);
      // At capacity: NO conception roll consumed
      expect(res.state.rng.counter).toBe(initialDrawCount);
      expect(Object.keys(res.state.lifecycle.pregnancies).length).toBe(0);
    }
  });

  it('reserves slots and gives birth atomically without exceeding capacity (R19, R20)', () => {
    const state = buildScenario('moo-moo-readiness');

    // Create a pregnancy directly to test atomic birth transition
    const pregId = 'preg_test_01';
    state.lifecycle.pregnancies[pregId] = {
      id: pregId,
      parentIds: ['cat_mochi', 'cat_wasabi'],
      startedAtSimMinute: state.clock.simMinute,
      dueAtSimMinute: state.clock.simMinute + 4320,
      reservedSlots: 2,
      conceptionEventId: 'evt_start',
    };
    state.cats['cat_wasabi'].pregnancyId = pregId;

    const livingBefore = state.livingCatIds.length; // 2
    expect(livingBefore).toBe(2);

    // Trigger birth
    const res = dispatch(
      state,
      { type: 'TRIGGER_BIRTH', payload: { pregnancyId: pregId } },
      { actorId: 'player', commandId: 'cmd_birth' }
    );

    expect(res.ok).toBe(true);
    // 2 kittens born
    expect(res.state.livingCatIds.length).toBe(livingBefore + 2);
    // Pregnancy removed
    expect(res.state.lifecycle.pregnancies[pregId]).toBeUndefined();
    expect(res.state.cats['cat_wasabi'].pregnancyId).toBeUndefined();
    // Kittens have parents recorded
    const kitten = Object.values(res.state.cats).find((c) => c.motherId === 'cat_mochi');
    expect(kitten).toBeDefined();
    expect(kitten?.lifeStage).toBe('kitten');
  });
});
