import { describe, expect, it } from 'vitest';
import { advanceNeeds, applyCareSatisfaction, calculateMood } from '../../../src/domain/core/needs';
import { evaluateCatAutonomy } from '../../../src/domain/core/autonomy';
import { buildScenario } from '../../../src/domain/scenarios';
import { SeededRng } from '../../../src/domain/rng';
import { NEED_DECAY_RATES } from '../../../src/domain/state';

describe('Needs, Mood Dynamics, and Autonomy', () => {
  it('decays needs honestly according to specified per-minute rates', () => {
    const initialNeeds = {
      hunger: 100,
      hygiene: 100,
      energy: 100,
      comfort: 100,
      social: 100,
      fun: 100,
      health: 100,
    };

    const elapsed = 60; // 60 sim minutes
    const res = advanceNeeds(initialNeeds, [], elapsed);

    expect(res.needs.hunger).toBeCloseTo(100 - NEED_DECAY_RATES.hunger * elapsed, 1);
    expect(res.needs.hygiene).toBeCloseTo(100 - NEED_DECAY_RATES.hygiene * elapsed, 1);
    expect(res.needs.energy).toBeCloseTo(100 - NEED_DECAY_RATES.energy * elapsed, 1);
    expect(res.needs.comfort).toBeCloseTo(100 - NEED_DECAY_RATES.comfort * elapsed, 1);
    expect(res.needs.social).toBeCloseTo(100 - NEED_DECAY_RATES.social * elapsed, 1);
    expect(res.needs.fun).toBeCloseTo(100 - NEED_DECAY_RATES.fun * elapsed, 1);
  });

  it('calculates mood score and maps to accurate mood bands', () => {
    // Ecstatic / Happy
    const highNeeds = { hunger: 95, hygiene: 90, energy: 95, comfort: 90, social: 90, fun: 90, health: 100 };
    expect(calculateMood(highNeeds).band).toBe('ecstatic');

    // Okay
    const midNeeds = { hunger: 55, hygiene: 50, energy: 50, comfort: 50, social: 50, fun: 50, health: 80 };
    expect(calculateMood(midNeeds).band).toBe('okay');

    // Low / Miserable
    const lowNeeds = { hunger: 15, hygiene: 15, energy: 10, comfort: 20, social: 20, fun: 15, health: 30 };
    expect(calculateMood(lowNeeds).band).toBe('miserable');
  });

  it('generates health and extreme need warnings when thresholds are crossed', () => {
    const criticalNeeds = { hunger: 10, hygiene: 10, energy: 10, comfort: 20, social: 20, fun: 20, health: 25 };
    const res = advanceNeeds(criticalNeeds, [], 1);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings.some((w) => w.includes('Health danger'))).toBe(true);
    expect(res.warnings.some((w) => w.includes('Extreme hunger'))).toBe(true);
  });

  it('applies care satisfaction effects accurately', () => {
    const lowHunger = { hunger: 20, hygiene: 50, energy: 50, comfort: 50, social: 50, fun: 50, health: 100 };
    const fed = applyCareSatisfaction(lowHunger, [], 'eat');
    expect(fed.hunger).toBe(70);

    const lowEnergy = { hunger: 50, hygiene: 50, energy: 20, comfort: 50, social: 50, fun: 50, health: 100 };
    const slept = applyCareSatisfaction(lowEnergy, [], 'sleep');
    expect(slept.energy).toBe(80);
  });

  it('autonomous AI selects high-utility actions based on critical needs', () => {
    const state = buildScenario('starter');
    const rng = new SeededRng(1234);

    // Make Mochi starving
    const mochi = state.cats['cat_mochi'];
    mochi.needs.hunger = 15;
    mochi.currentAction = null;
    mochi.actionQueue = [];

    const decision = evaluateCatAutonomy(mochi, state, rng);
    expect(decision.shouldAct).toBe(true);
    expect(decision.action?.type).toBe('eat');
    expect(decision.action?.targetId).toBe('obj_bowl_01');
  });
});
