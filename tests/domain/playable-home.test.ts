// tests/domain/playable-home.test.ts
// Domain-level tests: pathfinding, move-cat command, cat model, home layout.
import { describe, it, expect } from 'vitest';
import { dispatch } from '@/domain/commands';
import { selectView } from '@/domain/selectors';
import { findPath, isBlocked, sameCell, checkInvariants } from '@/domain/invariants';
import { defaultCats, defaultHome } from '@/domain/save-schema';
import type { WorldState } from '@/domain/state';
import { v4 as uuidv4 } from 'uuid';

function seededState(): WorldState {
  return {
    household: {
      id: uuidv4(),
      ownerId: uuidv4(),
      name: 'Test home',
      seed: 'test-seed',
      revision: 1,
      createdAt: Date.now(),
      launched: false,
      leaseEpoch: 0,
    },
    cats: defaultCats('test-seed'),
    home: defaultHome('test-seed'),
    simMinute: 0,
    paused: false,
  };
}

const HOME_W = 8;
const HOME_H = 6;

describe('home layout', () => {
  it('has a default cat Mochi at the expected starting position', () => {
    const state = seededState();
    expect(state.cats.mochi).toBeTruthy();
    expect(state.cats.mochi.position).toEqual({ lotId: 'home', x: 6, y: 4 });
  });

  it('has blocked cells that block the direct path to the garden', () => {
    const state = seededState();
    const garden = { lotId: 'home', x: 4, y: 2 };
    const start = state.cats.mochi.position;
    // The direct path from (6,4) to (4,2) passes through (4,3) which is blocked.
    expect(state.home.blockedCells).toContainEqual(expect.objectContaining({ x: 4, y: 3 }));
    expect(isBlocked({ lotId: 'home', x: 4, y: 3 }, state.home.blockedCells)).toBe(true);
    expect(isBlocked(garden, state.home.blockedCells)).toBe(false);
  });

  it('start and garden are not the same cell', () => {
    const state = seededState();
    expect(sameCell(state.cats.mochi.position, { lotId: 'home', x: 4, y: 2 })).toBe(false);
  });
});

describe('findPath', () => {
  it('finds a route around a blocked cell', () => {
    const start = { lotId: 'home', x: 6, y: 4 };
    const end = { lotId: 'home', x: 4, y: 2 };
    const blocked = [{ lotId: 'home', x: 4, y: 3 }];
    const path = findPath(start, end, blocked, HOME_W, HOME_H);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(4);
    // Every cell in the path must not be blocked.
    expect(path!.every(c => !isBlocked(c, blocked))).toBe(true);
    // First cell is the start, last cell is the destination.
    expect(sameCell(path![0], start)).toBe(true);
    expect(sameCell(path![path!.length - 1], end)).toBe(true);
  });

  it('returns null when destination is completely walled off', () => {
    const start = { lotId: 'home', x: 0, y: 0 };
    const end = { lotId: 'home', x: 7, y: 5 };
    // Block all in-bounds neighbors of (7,5): (6,5) and (7,4).
    const blocked = [
      { lotId: 'home', x: 6, y: 5 }, { lotId: 'home', x: 7, y: 4 },
    ];
    const path = findPath(start, end, blocked, HOME_W, HOME_H);
    expect(path).toBeNull();
  });

  it('returns [start] when start === end', () => {
    const start = { lotId: 'home', x: 3, y: 3 };
    const path = findPath(start, start, [], HOME_W, HOME_H);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(1);
    expect(sameCell(path![0], start)).toBe(true);
  });
});

describe('launch-world command', () => {
  it('sets launched=true and increments revision', () => {
    const state = seededState();
    expect(state.household.launched).toBe(false);
    const result = dispatch(state, { type: 'launch-world', payload: {} }, {
      actorId: state.household.ownerId,
      commandId: uuidv4(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.household.launched).toBe(true);
      expect(result.state.household.revision).toBe(2);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('world-launched');
    }
  });

  it('rejects launch without a household', () => {
    const state: WorldState = {
      household: { id: '', ownerId: '', name: '', seed: '', revision: 0, createdAt: 0, launched: false, leaseEpoch: 0 },
      cats: {},
      home: { lotId: '', width: 0, height: 0, blockedCells: [] },
      simMinute: 0,
      paused: false,
    };
    const result = dispatch(state, { type: 'launch-world', payload: {} }, {
      actorId: '',
      commandId: uuidv4(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('no-household');
  });
});

describe('move-cat command', () => {
  it('moves Mochi to the garden and records a valid route', () => {
    const state = seededState();
    const garden = { lotId: 'home', x: 4, y: 2 };
    const result = dispatch(state, {
      type: 'move-cat',
      payload: { catId: 'mochi', destination: garden },
    }, {
      actorId: state.household.ownerId,
      commandId: uuidv4(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const cat = result.state.cats.mochi;
      expect(cat.position).toEqual(garden);
      expect(cat.lastRoute.length).toBeGreaterThan(0);
      // Route must not pass through blocked cells.
      expect(cat.lastRoute.every(c => !isBlocked(c, state.home.blockedCells))).toBe(true);
      expect(result.state.household.revision).toBe(2);
      expect(result.events[0].type).toBe('cat-moved');
    }
  });

  it('rejects moving a non-existent cat', () => {
    const state = seededState();
    const result = dispatch(state, {
      type: 'move-cat',
      payload: { catId: 'ghost', destination: { lotId: 'home', x: 1, y: 1 } },
    }, { actorId: state.household.ownerId, commandId: uuidv4() });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('cat-not-found');
  });

  it('rejects unreachable destinations', () => {
    const state = seededState();
    // Block all in-bounds neighbors of (7,5): (6,5) and (7,4).
    const end = { lotId: 'home', x: 7, y: 5 };
    const customState: WorldState = {
      ...state,
      home: { ...state.home, blockedCells: [...state.home.blockedCells, { lotId: 'home', x: 6, y: 5 }, { lotId: 'home', x: 7, y: 4 }] },
    };
    const result = dispatch(customState, {
      type: 'move-cat',
      payload: { catId: 'mochi', destination: end },
    }, { actorId: customState.household.ownerId, commandId: uuidv4() });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unreachable');
  });
});

describe('selectView for playable-home', () => {
  it('projects cats and home into the view', () => {
    const state = seededState();
    const view = selectView(state);
    expect(view.household.launched).toBe(false);
    expect(view.cats.mochi).toBeTruthy();
    expect(view.cats.mochi.position).toEqual({ lotId: 'home', x: 6, y: 4 });
    expect(view.home.blockedCells).toHaveLength(1);
  });
});
