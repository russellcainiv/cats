import { describe, expect, it } from 'vitest';
import { advanceRouteProgress, findPath, isCellBlocked } from '../../../src/domain/core/navigation';
import { buildScenario } from '../../../src/domain/scenarios';

describe('Navigation, Collision, and Pathfinding', () => {
  it('finds reachable path on home lot avoiding blocked wall and furniture cells', () => {
    const state = buildScenario('playable-home');
    const lot = state.building.lots['home'];

    const start = { x: 4, y: 4 };
    const target = { x: 4, y: 2 };

    const result = findPath(lot, start, target);
    expect(result.reachable).toBe(true);
    expect(result.route.length).toBeGreaterThan(1);
    expect(result.route[0]).toEqual(start);
    expect(result.route[result.route.length - 1]).toEqual(target);

    // Every intermediate cell must NOT be blocked
    const allValid = result.route.every((cell) => !isCellBlocked(lot, cell));
    expect(allValid).toBe(true);
  });

  it('reports error when destination cell is directly blocked', () => {
    const state = buildScenario('playable-home');
    const lot = state.building.lots['home'];

    const start = { x: 4, y: 4 };
    const blockedTarget = { x: 0, y: 0 }; // north-west boundary wall

    const result = findPath(lot, start, blockedTarget);
    expect(result.reachable).toBe(false);
    expect(result.error).toContain('blocked or out of bounds');
  });

  it('steps cat along route smoothly with direction facing updates', () => {
    const startPos = { lotId: 'home', x: 4, y: 4, facing: 'south' as const };
    const route = [
      { x: 4, y: 4 },
      { x: 4, y: 3 },
      { x: 4, y: 2 },
    ];

    const { newPosition, remainingRoute } = advanceRouteProgress(startPos, route, 1); // 1 sim minute
    expect(newPosition.x).toBe(4);
    expect(newPosition.y).toBeLessThan(4);
    expect(newPosition.facing).toBe('north');
    expect(remainingRoute.length).toBeLessThan(route.length);
  });
});
