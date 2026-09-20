/**
 * Grid Navigation, Collision Detection, and A* Pathfinding
 */

import { CatPosition, GridCell, WorldLot } from '../state';

export interface PathfindingResult {
  reachable: boolean;
  route: GridCell[];
  error?: string;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseCellKey(key: string): GridCell {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export function getManhattanDistance(a: GridCell, b: GridCell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function isCellInsideLot(lot: WorldLot, cell: GridCell): boolean {
  return cell.x >= 0 && cell.x < lot.width && cell.y >= 0 && cell.y < lot.height;
}

export function isCellBlocked(lot: WorldLot, cell: GridCell): boolean {
  if (!isCellInsideLot(lot, cell)) {
    return true;
  }
  const key = cellKey(cell.x, cell.y);
  if (lot.doors && lot.doors.some((d) => d.x === cell.x && d.y === cell.y)) {
    return false;
  }
  return lot.blockedCells.includes(key);
}

export function recomputeBlockedCells(lot: {
  walls: readonly { x1: number; y1: number; x2: number; y2: number }[];
  objects: readonly { x: number; y: number; width?: number; height?: number }[];
  doors?: readonly { x: number; y: number }[];
}): string[] {
  const set = new Set<string>();
  for (const wall of lot.walls) {
    const minX = Math.min(wall.x1, wall.x2);
    const maxX = Math.max(wall.x1, wall.x2);
    const minY = Math.min(wall.y1, wall.y2);
    const maxY = Math.max(wall.y1, wall.y2);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        set.add(cellKey(x, y));
      }
    }
  }
  for (const obj of lot.objects) {
    const w = obj.width ?? 1;
    const h = obj.height ?? 1;
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        set.add(cellKey(obj.x + dx, obj.y + dy));
      }
    }
  }
  if (lot.doors) {
    for (const door of lot.doors) {
      set.delete(cellKey(door.x, door.y));
    }
  }
  return Array.from(set);
}

export function getFacingDirection(from: GridCell, to: GridCell): 'north' | 'south' | 'east' | 'west' {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'east' : 'west';
  } else {
    return dy >= 0 ? 'south' : 'north';
  }
}

/**
 * A* Pathfinding implementation on a 2D integer grid avoiding blocked cells
 */
export function findPath(
  lot: WorldLot,
  start: GridCell,
  target: GridCell
): PathfindingResult {
  if (start.x === target.x && start.y === target.y) {
    return { reachable: true, route: [start] };
  }

  if (isCellBlocked(lot, target)) {
    return {
      reachable: false,
      route: [],
      error: `Target cell (${target.x}, ${target.y}) is blocked or out of bounds`,
    };
  }

  const startKey = cellKey(start.x, start.y);
  const targetKey = cellKey(target.x, target.y);

  const openSet = new Set<string>([startKey]);
  const cameFrom = new Map<string, string>();

  const gScore = new Map<string, number>();
  gScore.set(startKey, 0);

  const fScore = new Map<string, number>();
  fScore.set(startKey, getManhattanDistance(start, target));

  const directions = [
    { x: 0, y: -1 }, // north
    { x: 0, y: 1 },  // south
    { x: 1, y: 0 },  // east
    { x: -1, y: 0 }, // west
  ];

  while (openSet.size > 0) {
    // Pick node in openSet with lowest fScore
    let currentKey = '';
    let lowestF = Infinity;
    for (const key of openSet) {
      const score = fScore.get(key) ?? Infinity;
      if (score < lowestF) {
        lowestF = score;
        currentKey = key;
      }
    }

    if (currentKey === targetKey) {
      // Reconstruct path
      const path: GridCell[] = [parseCellKey(currentKey)];
      let curr = currentKey;
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr)!;
        path.unshift(parseCellKey(curr));
      }
      return { reachable: true, route: path };
    }

    openSet.delete(currentKey);
    const currentCell = parseCellKey(currentKey);
    const currentG = gScore.get(currentKey) ?? Infinity;

    for (const dir of directions) {
      const neighbor: GridCell = { x: currentCell.x + dir.x, y: currentCell.y + dir.y };
      const neighborKey = cellKey(neighbor.x, neighbor.y);

      if (isCellBlocked(lot, neighbor) && neighborKey !== targetKey) {
        continue;
      }

      const tentativeG = currentG + 1;
      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + getManhattanDistance(neighbor, target));
        openSet.add(neighborKey);
      }
    }
  }

  return {
    reachable: false,
    route: [],
    error: `No reachable path between (${start.x}, ${start.y}) and (${target.x}, ${target.y})`,
  };
}

/**
 * Advances a cat's movement along a route given elapsed simulation time.
 * Speed: 1 cell per 1 simulation minute (can traverse multiple cells during multi-minute advances).
 */
export function advanceRouteProgress(
  currentPos: CatPosition,
  route: readonly GridCell[],
  elapsedMinutes: number
): { newPosition: CatPosition; remainingRoute: GridCell[] } {
  if (route.length <= 1 || elapsedMinutes <= 0) {
    return { newPosition: { ...currentPos }, remainingRoute: [...route] };
  }

  // How many steps can the cat take? At least 1 step per simulation minute
  const stepsToTake = Math.max(1, Math.floor(elapsedMinutes * 2));
  const availableSteps = route.length - 1;
  const actualSteps = Math.min(stepsToTake, availableSteps);

  const destinationCell = route[actualSteps];
  const facing = getFacingDirection(route[0], destinationCell);

  const newPosition: CatPosition = {
    lotId: currentPos.lotId,
    x: destinationCell.x,
    y: destinationCell.y,
    facing,
  };

  const remainingRoute = route.slice(actualSteps);

  return { newPosition, remainingRoute };
}
