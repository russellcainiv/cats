// src/domain/invariants.ts
// Task 01: capacity, identity, ownership. Task 02: pathfinding and collision.
import { WorldState, Position } from './state';
import type { Cat } from './state';

export type Violation = { code: string; message: string };

// R20: eight living cats plus reserved unborn slots; ninth creation changes nothing.
export const CAT_CAPACITY = 8;
export const LIVING_CAT_MAX = 8;

export function verifyCatCapacity(catCount: number): Violation | null {
  if (catCount >= CAT_CAPACITY) {
    return { code: 'capacity-exceeded', message: 'Household is at maximum capacity (8 living cats)' };
  }
  return null;
}

export function checkInvariants(state: WorldState): Violation[] {
  const violations: Violation[] = [];
  if (!state.household?.id) {
    violations.push({ code: 'missing-id', message: 'Household must have a stable identity' });
  }
  if (!state.household?.ownerId) {
    violations.push({ code: 'missing-owner', message: 'Household must have an owner' });
  }
  return violations;
}

// Cross-owner isolation.
export function canAccess(householdOwnerId: string, actorId: string | null): boolean {
  return actorId !== null && householdOwnerId === actorId;
}

// --- Pathfinding (BFS over grid, 4-directional) ---

function posKey(p: Position): string {
  return `${p.lotId}:${p.x}:${p.y}`;
}

export function sameCell(a: Position, b: Position): boolean {
  return a.lotId === b.lotId && a.x === b.x && a.y === b.y;
}

export function isBlocked(p: Position, blocked: Position[]): boolean {
  return blocked.some(b => sameCell(b, p));
}

export function inBounds(p: Position, home: { lotId: string; width: number; height: number }): boolean {
  return p.lotId === home.lotId && p.x >= 0 && p.x < home.width && p.y >= 0 && p.y < home.height;
}

/**
 * BFS pathfinding from start to end, avoiding blocked cells.
 * Returns the route (list of positions the cat passes through, INCLUSIVE of
 * start and end) or null if no path exists.
 */
export function findPath(
  start: Position,
  end: Position,
  blocked: Position[],
  width: number,
  height: number,
): Position[] | null {
  if (sameCell(start, end)) return [start];

  const blockedSet = new Set(blocked.map(posKey));
  const visited = new Set<string>();
  const queue: { pos: Position; path: Position[] }[] = [{ pos: start, path: [start] }];
  visited.add(posKey(start));

  const dirs: [number, number][] = [
    [0, -1], [1, 0], [0, 1], [-1, 0], // N, E, S, W
  ];

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const next: Position = { lotId: start.lotId, x: pos.x + dx, y: pos.y + dy };
      const key = posKey(next);
      if (visited.has(key)) continue;
      // Grid bounds — keeps BFS finite.
      if (next.x < 0 || next.x >= width || next.y < 0 || next.y >= height) continue;
      if (blockedSet.has(key)) continue;
      const nextPath = [...path, next];
      if (sameCell(next, end)) return nextPath;
      visited.add(key);
      queue.push({ pos: next, path: nextPath });
    }
  }
  return null;
}
