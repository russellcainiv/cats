import { describe, expect, it } from 'vitest';
import { assertInvariants, validateInvariants } from '../../../src/domain/invariants';
import { buildScenario } from '../../../src/domain/scenarios';
import { createCatRecord } from '../../../src/domain/core/cat';

describe('Domain Invariants', () => {
  it('validates starter scenario successfully without violations', () => {
    const state = buildScenario('starter');
    const violations = validateInvariants(state);
    expect(violations).toHaveLength(0);
    expect(() => assertInvariants(state)).not.toThrow();
  });

  it('detects and rejects violation when living cats exceed 8 (R20)', () => {
    const state = buildScenario('capacity-limit');
    // Add 2 more cats to bring total to 9
    for (let i = 8; i <= 9; i++) {
      const extra = createCatRecord({
        householdId: state.householdId,
        name: `Extra Cat ${i}`,
        appearance: { breed: 'calico', primaryColor: '#FFF', pattern: 'solid', eyeColor: 'blue', bodyType: 'average' },
        traits: ['playful'],
      });
      state.cats[extra.id] = extra;
      state.livingCatIds.push(extra.id);
    }

    const violations = validateInvariants(state);
    expect(violations.some((v) => v.code === 'CAPACITY_EXCEEDED_LIVING')).toBe(true);
    expect(() => assertInvariants(state)).toThrow(/CAPACITY_EXCEEDED_LIVING/);
  });

  it('detects violation when combined living and reserved slots exceed 8 (R20, R21)', () => {
    const state = buildScenario('capacity-limit'); // 7 living cats
    // Add a pregnancy with 2 reserved slots (7 + 2 = 9 > 8)
    state.lifecycle.pregnancies['preg_overflow'] = {
      id: 'preg_overflow',
      parentIds: ['cat_mochi', 'cat_2'],
      startedAtSimMinute: 100,
      dueAtSimMinute: 4420,
      reservedSlots: 2,
      conceptionEventId: 'evt_1',
    };

    const violations = validateInvariants(state);
    expect(violations.some((v) => v.code === 'CAPACITY_EXCEEDED_WITH_RESERVED')).toBe(true);
    expect(() => assertInvariants(state)).toThrow(/CAPACITY_EXCEEDED_WITH_RESERVED/);
  });

  it('detects violation if deceased cat remains in livingCatIds (R08, R22)', () => {
    const state = buildScenario('starter');
    state.cats['cat_mochi'].lifeStatus = 'deceased';

    const violations = validateInvariants(state);
    expect(violations.some((v) => v.code === 'INVALID_LIFE_STATUS_LIVING' || v.code === 'DECEASED_CAT_IN_LIVING_LIST')).toBe(true);
    expect(() => assertInvariants(state)).toThrow();
  });

  it('detects violation if a need is outside [0, 100]', () => {
    const state = buildScenario('starter');
    state.cats['cat_mochi'].needs.hunger = 120; // out of bounds

    const violations = validateInvariants(state);
    expect(violations.some((v) => v.code === 'NEED_OUT_OF_BOUNDS')).toBe(true);
    expect(() => assertInvariants(state)).toThrow(/NEED_OUT_OF_BOUNDS/);
  });

  it('detects violation if earnedCash is negative', () => {
    const state = buildScenario('starter');
    state.economy.wallet.earnedCash = -50;

    const violations = validateInvariants(state);
    expect(violations.some((v) => v.code === 'NEGATIVE_EARNED_CASH')).toBe(true);
    expect(() => assertInvariants(state)).toThrow(/NEGATIVE_EARNED_CASH/);
  });
});
