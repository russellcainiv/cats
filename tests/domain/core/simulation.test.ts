import { describe, expect, it } from 'vitest';
import { advance } from '../../../src/domain/simulation';
import { buildScenario } from '../../../src/domain/scenarios';
import { TOTAL_LIFESPAN_MINUTES } from '../../../src/domain/state';

describe('Deterministic Fixed-Step Simulation Engine', () => {
  it('does NOT advance simulation clock, needs, or age while paused (R09)', () => {
    const state = buildScenario('starter');
    expect(state.clock.isPaused).toBe(true);

    const initialMinute = state.clock.simMinute;
    const initialHunger = state.cats['cat_mochi'].needs.hunger;
    const initialAge = state.cats['cat_mochi'].ageMinutes;

    const advanced = advance(state, 60); // Attempt to advance 60 minutes while paused

    expect(advanced.clock.simMinute).toBe(initialMinute);
    expect(advanced.cats['cat_mochi'].needs.hunger).toBe(initialHunger);
    expect(advanced.cats['cat_mochi'].ageMinutes).toBe(initialAge);
  });

  it('advances deterministically when unpaused', () => {
    let state = buildScenario('starter');
    state = { ...state, clock: { ...state.clock, isPaused: false } };

    const initialMinute = state.clock.simMinute;
    const advanced = advance(state, 15);

    expect(advanced.clock.simMinute).toBe(initialMinute + 15);
    expect(advanced.cats['cat_mochi'].ageMinutes).toBe(state.cats['cat_mochi'].ageMinutes + 15);
    expect(advanced.cats['cat_mochi'].needs.hunger).toBeLessThan(state.cats['cat_mochi'].needs.hunger);
  });

  it('handles natural end of 150-sim-day lifespan permanently (R08, R22, R23)', () => {
    let state = buildScenario('death-and-memorial');
    state = { ...state, clock: { ...state.clock, isPaused: false } };

    expect(state.livingCatIds).toContain('cat_mochi');
    expect(state.cats['cat_mochi'].ageMinutes).toBe(TOTAL_LIFESPAN_MINUTES - 10);

    // Advance 15 minutes to cross the 150-day boundary
    const advanced = advance(state, 15);

    // Mochi must now be deceased
    expect(advanced.cats['cat_mochi'].lifeStatus).toBe('deceased');
    // Must NOT be in livingCatIds
    expect(advanced.livingCatIds).not.toContain('cat_mochi');
    // Memorial record must exist
    expect(advanced.lifecycle.memorials['mem_cat_mochi']).toBeDefined();
    expect(advanced.lifecycle.memorials['mem_cat_mochi'].name).toBe('Mochi');
  });

  it('pauses simulation automatically if zero living cats remain in household', () => {
    let state = buildScenario('starter');
    state = { ...state, clock: { ...state.clock, isPaused: false }, livingCatIds: [] };

    const advanced = advance(state, 10);
    expect(advanced.clock.isPaused).toBe(true);
  });
});
