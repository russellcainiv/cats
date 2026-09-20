// src/domain/building/geometry.ts
// Grid, Wall Topology, Collision Detection and Reachability Solver

import { WorldLot, LotObject, WallSegment, DoorItem, WindowItem, CatRecord, GridCell } from './types';
import { getCatalogItem } from './catalog';

export interface Dimension {
  width: number;
  height: number;
}

export function getRotatedDimensions(width: number, height: number, rotation: 0 | 90 | 180 | 270 = 0): Dimension {
  if (rotation === 90 || rotation === 270) {
    return { width: height, height: width };
  }
  return { width, height };
}

export function getObjectFootprint(x: number, y: number, width: number, height: number, rotation: 0 | 90 | 180 | 270 = 0): GridCell[] {
  const dims = getRotatedDimensions(width, height, rotation);
  const cells: GridCell[] = [];
  for (let dx = 0; dx < dims.width; dx++) {
    for (let dy = 0; dy < dims.height; dy++) {
      cells.push({ x: x + dx, y: y + dy });
    }
  }
  return cells;
}

export function getTransformedInteractSpots(
  x: number,
  y: number,
  baseWidth: number,
  baseHeight: number,
  interactSpots: GridCell[],
  rotation: 0 | 90 | 180 | 270 = 0
): GridCell[] {
  const dims = getRotatedDimensions(baseWidth, baseHeight, rotation);
  return interactSpots.map(spot => {
    const isAlreadyAbsolute = (x > 0 || y > 0) &&
      spot.x >= x - 1 && spot.x <= x + baseWidth + 1 &&
      spot.y >= y - 1 && spot.y <= y + baseHeight + 1 &&
      (spot.x >= x || spot.y >= y);

    if (isAlreadyAbsolute && rotation === 0) {
      return { x: spot.x, y: spot.y };
    }

    let rx = isAlreadyAbsolute ? spot.x - x : spot.x;
    let ry = isAlreadyAbsolute ? spot.y - y : spot.y;

    if (rotation === 90) {
      const origRx = rx;
      rx = baseHeight - 1 - ry;
      ry = origRx;
    } else if (rotation === 180) {
      rx = baseWidth - 1 - rx;
      ry = baseHeight - 1 - ry;
    } else if (rotation === 270) {
      const origRx = rx;
      rx = ry;
      ry = baseWidth - 1 - origRx;
    }

    return { x: x + rx, y: y + ry };
  });
}

export function isCellWithinLot(cell: GridCell, lot: WorldLot): boolean {
  return cell.x >= 0 && cell.x < lot.width && cell.y >= 0 && cell.y < lot.height;
}

export function isEdgeOnWall(x: number, y: number, orientation: 'horizontal' | 'vertical', walls: WallSegment[]): boolean {
  for (const wall of walls) {
    const minX = Math.min(wall.x1, wall.x2);
    const maxX = Math.max(wall.x1, wall.x2);
    const minY = Math.min(wall.y1, wall.y2);
    const maxY = Math.max(wall.y1, wall.y2);

    if (orientation === 'horizontal' && wall.y1 === wall.y2 && wall.y1 === y) {
      if (x >= minX && x < maxX) return true;
    }
    if (orientation === 'vertical' && wall.x1 === wall.x2 && wall.x1 === x) {
      if (y >= minY && y < maxY) return true;
    }
  }
  return false;
}

export function isCatIntersectingWall(catX: number, catY: number, wall: WallSegment): boolean {
  const minX = Math.min(wall.x1, wall.x2);
  const maxX = Math.max(wall.x1, wall.x2);
  const minY = Math.min(wall.y1, wall.y2);
  const maxY = Math.max(wall.y1, wall.y2);

  if (wall.y1 === wall.y2) {
    // Horizontal wall along y = wall.y1
    if (catY === wall.y1 && catX >= minX && catX <= maxX) return true;
  }
  if (wall.x1 === wall.x2) {
    // Vertical wall along x = wall.x1
    if (catX === wall.x1 && catY >= minY && catY <= maxY) return true;
  }
  return false;
}

export function checkWallEdgeBlocked(x1: number, y1: number, x2: number, y2: number, lot: WorldLot): boolean {
  // Checks if moving from (x1, y1) to (x2, y2) crosses a wall without a door
  if (x1 === x2 && Math.abs(y1 - y2) === 1) {
    // Vertical movement crossing horizontal wall line at max(y1, y2)
    const wallY = Math.max(y1, y2);
    const wallX = x1;
    if (isEdgeOnWall(wallX, wallY, 'horizontal', lot.walls)) {
      // Check if there is a door at this position
      const hasDoor = lot.doors.some(d => d.orientation === 'horizontal' && d.x === wallX && d.y === wallY);
      return !hasDoor;
    }
  } else if (y1 === y2 && Math.abs(x1 - x2) === 1) {
    // Horizontal movement crossing vertical wall line at max(x1, x2)
    const wallX = Math.max(x1, x2);
    const wallY = y1;
    if (isEdgeOnWall(wallX, wallY, 'vertical', lot.walls)) {
      const hasDoor = lot.doors.some(d => d.orientation === 'vertical' && d.x === wallX && d.y === wallY);
      return !hasDoor;
    }
  }
  return false;
}

export function isCellBlockedByObject(x: number, y: number, lot: WorldLot, ignoreObjectId?: string): boolean {
  for (const obj of lot.objects) {
    if (ignoreObjectId && obj.id === ignoreObjectId) continue;
    // Rugs or floor finish decor don't block movement
    if (obj.catalogId.includes('rug')) continue;

    const catalog = getCatalogItem(obj.catalogId);
    const w = catalog ? catalog.width : obj.width;
    const h = catalog ? catalog.height : obj.height;
    const footprint = getObjectFootprint(obj.x, obj.y, w, h, obj.rotation ?? 0);

    if (footprint.some(cell => cell.x === x && cell.y === y)) {
      return true;
    }
  }
  return false;
}

/**
 * Validates if an edit produces a valid reachability layout.
 * Ensures:
 * 1. Cats on lot are not trapped or standing inside walls/objects.
 * 2. Every room inside the house is reachable from at least one door / lot entrance.
 * 3. All object interact spots are inside bounds and reachable.
 */
export function validateLotReachability(lot: WorldLot, catsOnLot: CatRecord[]): { valid: boolean; reason?: string } {
  // Check cats positions
  for (const cat of catsOnLot) {
    if (cat.position.lotId !== lot.id) continue;
    const cx = Math.floor(cat.position.x);
    const cy = Math.floor(cat.position.y);

    if (!isCellWithinLot({ x: cx, y: cy }, lot)) {
      return { valid: false, reason: `Cat ${cat.name} is out of lot bounds.` };
    }
    if (isCellBlockedByObject(cx, cy, lot)) {
      return { valid: false, reason: `Cat ${cat.name} is trapped inside an object.` };
    }
  }

  // Find entrance seed cells.
  // Door locations and lot entrance (0,0) provide seeds for BFS traversal.
  const seedCells: GridCell[] = [{ x: 0, y: 0 }];
  if (lot.doors.length > 0) {
    for (const d of lot.doors) {
      seedCells.push({ x: d.x, y: d.y });
      if (d.orientation === 'horizontal' && d.y > 0) seedCells.push({ x: d.x, y: d.y - 1 });
      if (d.orientation === 'vertical' && d.x > 0) seedCells.push({ x: d.x - 1, y: d.y });
    }
  }

  // Perform BFS graph traversal
  const visited = new Set<string>();
  const queue: GridCell[] = [];

  for (const seed of seedCells) {
    if (isCellWithinLot(seed, lot) && !isCellBlockedByObject(seed.x, seed.y, lot)) {
      const key = `${seed.x},${seed.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(seed);
      }
    }
  }

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const nextCell = { x: nx, y: ny };

      if (!isCellWithinLot(nextCell, lot)) continue;
      if (isCellBlockedByObject(nx, ny, lot)) continue;
      if (checkWallEdgeBlocked(current.x, current.y, nx, ny, lot)) continue;

      const key = `${nx},${ny}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(nextCell);
      }
    }
  }

  // 1. Verify every cat on this lot is reachable in visited set
  for (const cat of catsOnLot) {
    if (cat.position.lotId !== lot.id) continue;
    const cx = Math.floor(cat.position.x);
    const cy = Math.floor(cat.position.y);
    if (!visited.has(`${cx},${cy}`)) {
      return { valid: false, reason: `Cat ${cat.name} at (${cx}, ${cy}) is trapped and unreachable.` };
    }
  }

  // 2. Verify all object interact spots are within bounds and reachable
  for (const obj of lot.objects) {
    if (!obj.interactSpots || obj.interactSpots.length === 0) continue;
    const catalog = getCatalogItem(obj.catalogId);
    const baseW = catalog ? catalog.width : obj.width;
    const baseH = catalog ? catalog.height : obj.height;
    const transformedSpots = getTransformedInteractSpots(
      obj.x,
      obj.y,
      baseW,
      baseH,
      obj.interactSpots,
      obj.rotation ?? 0
    );

    for (const spot of transformedSpots) {
      if (!isCellWithinLot(spot, lot)) {
        return { valid: false, reason: `Object ${obj.name} interact spot (${spot.x}, ${spot.y}) is outside lot bounds.` };
      }
      if (!visited.has(`${spot.x},${spot.y}`)) {
        return { valid: false, reason: `Object ${obj.name} interact spot (${spot.x}, ${spot.y}) is unreachable.` };
      }
    }
  }

  return { valid: true };
}
