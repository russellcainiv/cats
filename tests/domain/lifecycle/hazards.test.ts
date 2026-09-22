// tests/domain/lifecycle/hazards.test.ts
import { describe, it, expect } from 'vitest';
import { createTestWorldState, createTestCommandContext } from './harness';
import { processHazardsTick, executeHazardIntervention, WARNING_WINDOW_MINUTES } from '../../../src/domain/lifecycle/hazards';

describe('Health Hazards, Warnings & Interventions', () => {
  it('issues a warning when a cat is neglected or ill', () => {
    const world = createTestWorldState();
    const cat = world.cats['cat_dam'];
    cat.needs.hunger = 0; // Extreme neglect

    const { state: updatedState, events } = processHazardsTick(world, 10);

    expect(updatedState.cats['cat_dam'].health?.warningIssued).toBe(true);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('HEALTH_WARNING_ISSUED');
  });

  it('rescues cat and clears warning when INTERVENE_HAZARD is issued in time', () => {
    const world = createTestWorldState();
    const cat = world.cats['cat_dam'];
    cat.needs.hunger = 0;

    // Issue warning
    const { state: stateWithWarning } = processHazardsTick(world, 10);

    // Intervene
    const result = executeHazardIntervention(
      stateWithWarning,
      { type: 'INTERVENE_HAZARD', payload: { catId: 'cat_dam', treatmentType: 'care' } },
      createTestCommandContext()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rescuedState = result.state;
    expect(rescuedState.cats['cat_dam'].health?.warningIssued).toBe(false);
    expect(rescuedState.cats['cat_dam'].health?.hasActiveHazard).toBe(false);
    expect(rescuedState.cats['cat_dam'].needs.hunger).toBeGreaterThan(0);
  });

  it('triggers preventable death if warning window expires without intervention', () => {
    const world = createTestWorldState();
    const cat = world.cats['cat_dam'];
    cat.needs.hunger = 0;

    // Issue warning
    const { state: stateWithWarning } = processHazardsTick(world, 10);

    // Advance clock past warning window (WARNING_WINDOW_MINUTES)
    stateWithWarning.clock.simMinute += WARNING_WINDOW_MINUTES + 1;

    const { state: stateAfterDeath, events } = processHazardsTick(stateWithWarning, WARNING_WINDOW_MINUTES + 1);

    expect(stateAfterDeath.cats['cat_dam'].lifeStatus).toBe('deceased');
    expect(stateAfterDeath.cats['cat_dam'].causeOfDeath).toBe('extreme_neglect');
    expect(events.some(e => e.type === 'CAT_DIED')).toBe(true);
  });
});
