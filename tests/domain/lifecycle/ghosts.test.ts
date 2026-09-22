// tests/domain/lifecycle/ghosts.test.ts
import { describe, it, expect } from 'vitest';
import { createTestWorldState, createTestCommandContext } from './harness';
import { executePlaceMemorial, executeDismissGhost, processGhostTick } from '../../../src/domain/lifecycle/ghosts';
import { MemorialRecord } from '../../../src/domain/lifecycle/types';

describe('Memorials & Ghost Projections', () => {
  it('places and moves a memorial tombstone', () => {
    const world = createTestWorldState();
    const mem: MemorialRecord = {
      id: 'mem_1',
      deceasedCatId: 'cat_deceased',
      catName: 'GhostCat',
      appearance: { coatColor: 'white', coatPattern: 'solid', eyeColor: 'blue' },
      traits: ['playful'],
      ageAtDeathMinutes: 216000,
      causeOfDeath: 'old_age',
      deceasedAtSimMinute: 1000,
      tombstonePosition: { lotId: 'lot_home', x: 0, y: 0 },
      ghostVisits: [],
    };
    world.lifecycle.memorials['mem_1'] = mem;

    const result = executePlaceMemorial(
      world,
      { type: 'PLACE_MEMORIAL', payload: { deceasedCatId: 'cat_deceased', lotId: 'lot_home', x: 10, y: 12 } },
      createTestCommandContext()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.lifecycle.memorials['mem_1'].tombstonePosition).toEqual({ lotId: 'lot_home', x: 10, y: 12 });
  });

  it('spawns ghost projections on night transitions without increasing living cat count', () => {
    const world = createTestWorldState();
    const mem: MemorialRecord = {
      id: 'mem_1',
      deceasedCatId: 'cat_deceased',
      catName: 'GhostCat',
      appearance: { coatColor: 'white', coatPattern: 'solid', eyeColor: 'blue' },
      traits: ['playful'],
      ageAtDeathMinutes: 216000,
      causeOfDeath: 'old_age',
      deceasedAtSimMinute: 1000,
      tombstonePosition: { lotId: 'lot_home', x: 2, y: 2 },
      ghostVisits: [],
    };
    world.lifecycle.memorials['mem_1'] = mem;

    const initialLivingCount = world.livingCatIds.length;

    // Set clock to midnight (1440 sim minutes)
    world.clock.simMinute = 1440;
    // Set seed to guarantee ghost spawn
    world.rng.seed = 1;

    const { state: nightState } = processGhostTick(world, 10);

    // Ghost should spawn
    expect(nightState.lifecycle.ghosts.length).toBe(1);
    expect(nightState.lifecycle.ghosts[0].name).toBe('GhostCat');

    // Invariant: Living cat count MUST NOT change!
    expect(nightState.livingCatIds.length).toBe(initialLivingCount);
  });

  it('dismisses an active ghost projection', () => {
    const world = createTestWorldState();
    world.lifecycle.ghosts = [
      {
        memorialId: 'mem_1',
        deceasedCatId: 'cat_deceased',
        name: 'GhostCat',
        appearance: { coatColor: 'white', coatPattern: 'solid', eyeColor: 'blue' },
        position: { lotId: 'lot_home', x: 2, y: 2 },
        expiresAtSimMinute: 2000,
      },
    ];

    const result = executeDismissGhost(
      world,
      { type: 'DISMISS_GHOST', payload: { memorialId: 'mem_1' } },
      createTestCommandContext()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.lifecycle.ghosts.length).toBe(0);
  });
});
