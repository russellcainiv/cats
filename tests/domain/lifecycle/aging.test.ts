// tests/domain/lifecycle/aging.test.ts
import { describe, it, expect } from 'vitest';
import { createTestWorldState } from './harness';
import { processAgingTick, LIFESPAN_TOTAL_MINUTES } from '../../../src/domain/lifecycle/aging';

describe('Aging & Lifespan Stages', () => {
  it('does not age when simulation is paused', () => {
    const world = createTestWorldState();
    world.clock.isPaused = true;
    const cat = world.cats['cat_dam'];
    const initialAge = cat.ageMinutes;

    const { state: updatedState } = processAgingTick(world, 1440);
    expect(updatedState.cats['cat_dam'].ageMinutes).toBe(initialAge);
  });

  it('progresses through kitten, adolescent, adult, and elder stages based on age', () => {
    const world = createTestWorldState();
    const cat = world.cats['cat_dam'];
    cat.ageMinutes = 0;
    cat.lifeStage = 'kitten';

    // Advance 10 days (14,400 mins) -> should become adolescent
    world.clock.simMinute += 14400;
    const { state: s1 } = processAgingTick(world, 14400);
    expect(s1.cats['cat_dam'].lifeStage).toBe('adolescent');

    // Advance 20 more days (28,800 mins) -> total 30 days -> should become adult
    s1.clock.simMinute += 28800;
    const { state: s2 } = processAgingTick(s1, 28800);
    expect(s2.cats['cat_dam'].lifeStage).toBe('adult');

    // Advance 95 more days (136,800 mins) -> total 125 days -> should become elder
    s2.clock.simMinute += 136800;
    const { state: s3 } = processAgingTick(s2, 136800);
    expect(s3.cats['cat_dam'].lifeStage).toBe('elder');
  });

  it('triggers old age death exactly at 150 days and handles final cat death', () => {
    const world = createTestWorldState();
    // Leave only 1 living cat
    world.livingCatIds = ['cat_dam'];
    delete world.cats['cat_sire'];

    const cat = world.cats['cat_dam'];
    cat.ageMinutes = LIFESPAN_TOTAL_MINUTES - 10; // 10 mins before 150 days

    const { state: finalState, events } = processAgingTick(world, 10);

    expect(finalState.cats['cat_dam'].lifeStatus).toBe('deceased');
    expect(finalState.cats['cat_dam'].causeOfDeath).toBe('old_age');
    expect(finalState.livingCatIds.length).toBe(0);

    const deathEvents = events.filter(e => e.type === 'CAT_DIED');
    const finalDeathEvents = events.filter(e => e.type === 'FINAL_CAT_DIED');
    expect(deathEvents.length).toBe(1);
    expect(finalDeathEvents.length).toBe(1);

    // Memorial created
    expect(Object.keys(finalState.lifecycle.memorials).length).toBe(1);
  });
});
