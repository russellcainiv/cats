import { describe, expect, it } from 'vitest';
import { selectView } from '../../../src/domain/selectors';
import { buildScenario } from '../../../src/domain/scenarios';

describe('GameView Projection Selectors', () => {
  it('projects honest, complete GameView matching acceptance contracts', () => {
    const state = buildScenario('starter');
    const view = selectView(state);

    expect(view.household.name).toBe('My Cats');
    expect(view.household.livingCount).toBe(1);
    expect(view.household.capacity).toBe(8);
    expect(view.household.reservedLitterSlots).toBe(0);

    expect(view.simulation.isPaused).toBe(true);
    expect(view.simulation.statusText).toBe('Paused');
    expect(view.simulation.day).toBe(1);

    // Mochi accessible strictly by CatId
    expect(view.cats['cat_mochi']).toBeDefined();
    expect(view.cats['cat_mochi'].name).toBe('Mochi');
    expect(view.cats['cat_mochi'].position).toEqual({ lotId: 'home', x: 4, y: 4, facing: 'south' });

    // Home lot details
    expect(view.home.id).toBe('home');
    expect(view.home.width).toBe(12);
    expect(view.home.height).toBe(10);
    expect(view.home.blockedCells.length).toBeGreaterThan(0);
    expect(view.home.objects.length).toBeGreaterThan(0);

    // Economy & wallet
    expect(view.wallet.earnedCash).toBe(500);
    expect(view.wallet.mode).toBe('normal');
  });

  it('projects urgent warnings when cats have low health or critical needs', () => {
    const state = buildScenario('starter');
    state.cats['cat_mochi'].needs.health = 25; // Health danger
    state.cats['cat_mochi'].needs.hunger = 10; // Starving

    const view = selectView(state);
    expect(view.warnings.length).toBeGreaterThanOrEqual(2);
    expect(view.warnings.some((w) => w.type === 'health_danger')).toBe(true);
    expect(view.warnings.some((w) => w.type === 'extreme_need')).toBe(true);
  });
});
