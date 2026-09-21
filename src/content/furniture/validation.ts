import { ExpandedFurnitureItem, EngineCatalogItem } from './types';

/**
 * Validates a single ExpandedFurnitureItem for schema correctness.
 * Returns an array of error messages. If valid, returns empty array.
 */
export function validateFurnitureItem(item: ExpandedFurnitureItem): string[] {
  const errors: string[] = [];

  if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
    errors.push(`Item missing valid id: ${JSON.stringify(item)}`);
  }

  if (!item.displayName || typeof item.displayName !== 'string' || item.displayName.trim() === '') {
    errors.push(`Item ${item.id || 'unknown'}: missing valid displayName`);
  }

  if (typeof item.costCoins !== 'number' || !Number.isFinite(item.costCoins) || item.costCoins < 0) {
    errors.push(`Item ${item.id}: invalid costCoins (${item.costCoins}). Must be non-negative finite number.`);
  }

  if (typeof item.width !== 'number' || !Number.isInteger(item.width) || item.width <= 0) {
    errors.push(`Item ${item.id}: invalid width (${item.width}). Must be positive integer.`);
  }

  if (typeof item.height !== 'number' || !Number.isInteger(item.height) || item.height <= 0) {
    errors.push(`Item ${item.id}: invalid height (${item.height}). Must be positive integer.`);
  }

  if (!Array.isArray(item.allowedRotations) || item.allowedRotations.length === 0) {
    errors.push(`Item ${item.id}: allowedRotations must be a non-empty array.`);
  }

  if (!Array.isArray(item.paletteVariants) || item.paletteVariants.length === 0) {
    errors.push(`Item ${item.id}: paletteVariants must be a non-empty array.`);
  }

  // Validate interact spots fall within bounding box (0 <= x < width, 0 <= y < height)
  if (Array.isArray(item.interactSpots)) {
    for (const spot of item.interactSpots) {
      if (spot.x < 0 || spot.x >= item.width || spot.y < 0 || spot.y >= item.height) {
        errors.push(
          `Item ${item.id}: interactSpot (${spot.x}, ${spot.y}) is outside footprint ${item.width}x${item.height}.`
        );
      }
    }
  } else {
    errors.push(`Item ${item.id}: interactSpots must be an array.`);
  }

  if (item.needAffordance) {
    if (
      typeof item.needAffordance.satisfactionRate !== 'number' ||
      !Number.isFinite(item.needAffordance.satisfactionRate) ||
      item.needAffordance.satisfactionRate <= 0
    ) {
      errors.push(`Item ${item.id}: needAffordance.satisfactionRate must be a positive finite number.`);
    }
  }

  if (typeof item.schemaVersion !== 'number' || item.schemaVersion <= 0) {
    errors.push(`Item ${item.id}: schemaVersion must be positive number.`);
  }

  return errors;
}

/**
 * Validates an entire collection of ExpandedFurnitureItems.
 * Ensures no duplicate IDs and all items are valid.
 */
export function validateFurnitureCatalog(items: ExpandedFurnitureItem[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    const itemErrors = validateFurnitureItem(item);
    errors.push(...itemErrors);

    if (item.id) {
      if (seenIds.has(item.id)) {
        errors.push(`Duplicate furniture item ID found in catalog: ${item.id}`);
      } else {
        seenIds.add(item.id);
      }
    }
  }

  return errors;
}

/**
 * Adapter converting ExpandedFurnitureItem to EngineCatalogItem contract.
 */
export function toEngineCatalogItem(item: ExpandedFurnitureItem): EngineCatalogItem {
  return {
    id: item.id,
    name: item.displayName,
    category: item.category,
    cost: item.costCoins,
    width: item.width,
    height: item.height,
    colorVariants: [...item.paletteVariants],
    interactSpots: item.interactSpots.map((s) => ({ x: s.x, y: s.y })),
    requiresWall: item.requiresWall,
    description: item.description,
    style: item.style,
    isSolid: item.isSolid,
    needAffordance: item.needAffordance,
    assetKey: item.assetKey,
    atlas: item.atlas,
    artStatus: item.artStatus,
    schemaVersion: item.schemaVersion,
  };
}
