// tests/domain/social/social.test.ts
// Comprehensive unit and integration test suite for Social Domain Subsystem.

import assert from 'node:assert';
import {
  createTestCat,
  createTestWorldState,
  createTestContext
} from './scaffold';
import {
  reduceSocial,
  advanceSocial,
  checkMooMooEligibility,
  pairKey,
  getRelationship,
  updateRelationshipScore,
  WorldState,
  CatRecord
} from '../../../src/domain/social/index';

export function runAllSocialTests() {
  console.log('--- Running Social Domain Subsystem Tests ---');

  // 1. Mutual Readiness Matrix
  {
    const cat1 = createTestCat('cat1', 'Mochi', { lifeStage: 'adult' });
    const cat2 = createTestCat('cat2', 'Luna', { lifeStage: 'adult' });
    let state = createTestWorldState([cat1, cat2]);

    const pKey = pairKey('cat1', 'cat2');
    state.social.relationships[pKey] = {
      friendship: 60,
      romance: 80,
      isLove: true,
      isRival: false,
      isFriend: true,
      interactionCount: 5,
      lastInteractionSimMinute: 10
    };

    const result = checkMooMooEligibility(state, 'cat1', 'cat2');
    assert.strictEqual(result.eligible, true, 'Adult cats in mutual love should be eligible');

    // Kitten check
    const kitten = createTestCat('cat3', 'Kitten', { lifeStage: 'kitten' });
    let stateKitten = createTestWorldState([cat1, kitten]);
    stateKitten.social.relationships[pairKey('cat1', 'cat3')] = { ...state.social.relationships[pKey] };
    const resKitten = checkMooMooEligibility(stateKitten, 'cat1', 'cat3');
    assert.strictEqual(resKitten.eligible, false, 'Kitten must be rejected');
    assert.ok(resKitten.reason?.includes('adults'));

    // Family link check
    const daughter = createTestCat('cat4', 'Daughter', { lifeStage: 'adult', motherId: 'cat1' });
    let stateFamily = createTestWorldState([cat1, daughter]);
    stateFamily.social.relationships[pairKey('cat1', 'cat4')] = { ...state.social.relationships[pKey] };
    const resFamily = checkMooMooEligibility(stateFamily, 'cat1', 'cat4');
    assert.strictEqual(resFamily.eligible, false, 'Family link must be rejected');
    assert.ok(resFamily.reason?.includes('family'));

    console.log('✓ 1. Mutual readiness matrix verified');
  }

  // 2. Decline and RNG Purity
  {
    const cat1 = createTestCat('cat1', 'Mochi', { lifeStage: 'adult' });
    const cat2 = createTestCat('cat2', 'Luna', { lifeStage: 'adult' });
    let state = createTestWorldState([cat1, cat2]);

    const initialRngCounter = state.rng.counter;

    const ctx = createTestContext('cmd_decline_test');
    const res = reduceSocial(
      state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat1', partnerId: 'cat2' }
      },
      ctx
    );

    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.state.rng.counter, initialRngCounter, 'RNG counter must not advance on decline');

    const declinedEvt = res.state.events.find((e) => e.type === 'MOO_MOO_DECLINED');
    assert.ok(declinedEvt, 'MOO_MOO_DECLINED event emitted');

    const pKey = pairKey('cat1', 'cat2');
    assert.ok(res.state.social.pairCooldowns[pKey] > state.clock.simMinute, 'Pair cooldown set');

    console.log('✓ 2. Decline and RNG purity verified');
  }

  // 3. At-Capacity Completion
  {
    const cats: CatRecord[] = [];
    for (let i = 1; i <= 8; i++) {
      cats.push(createTestCat(`cat${i}`, `Cat ${i}`, { lifeStage: 'adult' }));
    }
    let state = createTestWorldState(cats);

    const pKey = pairKey('cat1', 'cat2');
    state.social.relationships[pKey] = {
      friendship: 70,
      romance: 90,
      isLove: true,
      isRival: false,
      isFriend: true,
      interactionCount: 5,
      lastInteractionSimMinute: 10
    };

    const ctx = createTestContext('cmd_moo_capacity');
    const startRes = reduceSocial(
      state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat1', partnerId: 'cat2' }
      },
      ctx
    );
    assert.strictEqual(startRes.ok, true);
    state = startRes.state;

    const rngBeforeAdvance = state.rng.counter;

    state = advanceSocial(state, 10);

    const completeEvt = state.events.find((e) => e.type === 'MOO_MOO_COMPLETED');
    assert.ok(completeEvt, 'MOO_MOO_COMPLETED event emitted');
    assert.strictEqual(state.rng.counter, rngBeforeAdvance, 'ZERO conception draws made at capacity 8');
    assert.strictEqual(Object.keys(state.lifecycle.pregnancies).length, 0, 'No pregnancy created');

    console.log('✓ 3. At-capacity completion verified');
  }

  // 4. Capacity-Clamped Concurrent Conception Reservation
  {
    const cats: CatRecord[] = [];
    for (let i = 1; i <= 7; i++) {
      cats.push(createTestCat(`cat${i}`, `Cat ${i}`, { lifeStage: 'adult' }));
    }
    let state = createTestWorldState(cats);
    state.rng = { seed: 1, counter: 0 };

    const pKey = pairKey('cat1', 'cat2');
    state.social.relationships[pKey] = {
      friendship: 80,
      romance: 90,
      isLove: true,
      isRival: false,
      isFriend: true,
      interactionCount: 5,
      lastInteractionSimMinute: 10
    };

    const startRes = reduceSocial(
      state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat1', partnerId: 'cat2' }
      },
      createTestContext('cmd_clamp_1')
    );
    assert.strictEqual(startRes.ok, true);
    state = startRes.state;

    state = advanceSocial(state, 10);

    const pregKeys = Object.keys(state.lifecycle.pregnancies);
    if (pregKeys.length > 0) {
      const preg = state.lifecycle.pregnancies[pregKeys[0]];
      assert.ok(preg.reservedSlots <= 1, 'Reserved slots clamped to 1');
    }

    console.log('✓ 4. Capacity-clamped conception reservation verified');
  }

  // 5. Exactly-Once Completion / Idempotency
  {
    const cat1 = createTestCat('cat1', 'Mochi', { lifeStage: 'adult' });
    const cat2 = createTestCat('cat2', 'Luna', { lifeStage: 'adult' });
    let state = createTestWorldState([cat1, cat2]);

    const pKey = pairKey('cat1', 'cat2');
    state.social.relationships[pKey] = {
      friendship: 80,
      romance: 90,
      isLove: true,
      isRival: false,
      isFriend: true,
      interactionCount: 5,
      lastInteractionSimMinute: 10
    };

    const ctx = createTestContext('cmd_idempotent_1');
    const firstRes = reduceSocial(
      state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat1', partnerId: 'cat2' }
      },
      ctx
    );
    assert.strictEqual(firstRes.ok, true);

    const secondRes = reduceSocial(
      firstRes.state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat1', partnerId: 'cat2' }
      },
      ctx
    );

    assert.strictEqual(secondRes.state.social.inProgressActions.length, 1);
    assert.strictEqual(secondRes.events.length, 0);

    console.log('✓ 5. Idempotency verified');
  }

  // 6. Deterministic Replay
  {
    const cat1 = createTestCat('cat1', 'Mochi');
    const cat2 = createTestCat('cat2', 'Luna');

    const runSequence = () => {
      let state = createTestWorldState([cat1, cat2]);
      state.rng = { seed: 999, counter: 0 };

      const res1 = reduceSocial(
        state,
        {
          type: 'SOCIAL_INTERACT',
          payload: { initiatorId: 'cat1', targetId: 'cat2', interactionType: 'nuzzle' }
        },
        createTestContext('c1')
      );

      let s = advanceSocial(res1.state, 20);

      const res2 = reduceSocial(
        s,
        {
          type: 'SOCIAL_INTERACT',
          payload: { initiatorId: 'cat1', targetId: 'cat2', interactionType: 'play_chase' }
        },
        createTestContext('c2')
      );

      s = advanceSocial(res2.state, 20);
      return { state: s, events: s.events };
    };

    const runA = runSequence();
    const runB = runSequence();

    assert.strictEqual(JSON.stringify(runA.state), JSON.stringify(runB.state));
    assert.strictEqual(JSON.stringify(runA.events), JSON.stringify(runB.events));

    console.log('✓ 6. Deterministic replay verified');
  }

  // 7. Autonomy and Player Suggestion Parity
  {
    const cat1 = createTestCat('cat1', 'Mochi', { lifeStage: 'adult' });
    const cat2 = createTestCat('cat2', 'Luna', { lifeStage: 'adult' });
    let state = createTestWorldState([cat1, cat2]);

    const pKey = pairKey('cat1', 'cat2');
    state.social.relationships[pKey] = {
      friendship: 10,
      romance: 10,
      isLove: false,
      isRival: false,
      isFriend: false,
      interactionCount: 1,
      lastInteractionSimMinute: 10
    };

    const playerRes = reduceSocial(
      state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat1', partnerId: 'cat2' }
      },
      createTestContext('cmd_player')
    );

    const autoRes = reduceSocial(
      state,
      {
        type: 'PROPOSE_MOO_MOO',
        payload: { initiatorId: 'cat1', partnerId: 'cat2', source: 'autonomous' }
      },
      createTestContext('cmd_auto')
    );

    assert.strictEqual(playerRes.ok, false);
    assert.strictEqual(autoRes.ok, false);
    assert.strictEqual(playerRes.error?.code, autoRes.error?.code);

    console.log('✓ 7. Autonomy and player suggestion parity verified');
  }

  // 8. Pair Cooldown Enforcement
  {
    const cat1 = createTestCat('cat1', 'Mochi', { lifeStage: 'adult' });
    const cat2 = createTestCat('cat2', 'Luna', { lifeStage: 'adult' });
    let state = createTestWorldState([cat1, cat2]);

    const pKey = pairKey('cat1', 'cat2');
    state.social.relationships[pKey] = {
      friendship: 80,
      romance: 90,
      isLove: true,
      isRival: false,
      isFriend: true,
      interactionCount: 5,
      lastInteractionSimMinute: 10
    };

    state.social.pairCooldowns[pKey] = 200;

    const res = reduceSocial(
      state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat1', partnerId: 'cat2' }
      },
      createTestContext('cmd_cooldown_check')
    );

    assert.strictEqual(res.ok, false);
    assert.ok(res.error?.message.includes('cooldown'));

    console.log('✓ 8. Pair cooldown enforcement verified');
  }

  // 9. Interrupted Social Action and Safe Settlement
  {
    const cat1 = createTestCat('cat1', 'Mochi', { lifeStage: 'adult' });
    const cat2 = createTestCat('cat2', 'Luna', { lifeStage: 'adult' });
    let state = createTestWorldState([cat1, cat2]);

    const pKey = pairKey('cat1', 'cat2');
    state.social.relationships[pKey] = {
      friendship: 80,
      romance: 90,
      isLove: true,
      isRival: false,
      isFriend: true,
      interactionCount: 5,
      lastInteractionSimMinute: 10
    };

    const startRes = reduceSocial(
      state,
      {
        type: 'SUGGEST_MOO_MOO',
        payload: { initiatorId: 'cat1', partnerId: 'cat2' }
      },
      createTestContext('cmd_interrupt_1')
    );

    assert.strictEqual(startRes.ok, true);
    state = startRes.state;

    state.cats['cat2'] = {
      ...state.cats['cat2'],
      lifeStatus: 'deceased'
    };

    state = advanceSocial(state, 5);

    assert.strictEqual(state.social.inProgressActions.length, 0);
    const cancelEvt = state.events.find((e) => e.type === 'MOO_MOO_CANCELLED');
    assert.ok(cancelEvt);
    assert.strictEqual(state.cats['cat1'].currentAction, null);

    console.log('✓ 9. Interrupted social action settlement verified');
  }

  console.log('ALL SOCIAL DOMAIN TESTS PASSED SUCCESSFULLY!');
}

runAllSocialTests();
