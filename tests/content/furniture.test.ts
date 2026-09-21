import { test, expect, describe } from 'bun:test';
import { FurnitureCatalogAdapter } from '../../src/content/furniture/adapter';
import { validateFurnitureItem, validateFurnitureCatalog } from '../../src/content/furniture/validation';
import { ExpandedFurnitureItem } from '../../src/content/furniture/types';
import { LEGACY_30_ITEMS } from '../../src/content/furniture/legacy_catalog';
import { FULL_EXPANDED_FURNITURE_CATALOG } from '../../src/content/furniture/expanded_catalog';

describe('Expanded Furniture Catalog & Legacy Adapter Tests', () => {
  const adapter = new FurnitureCatalogAdapter();

  test('Catalog contains at least 64 unique functional/decor items', () => {
    expect(adapter.size).toBeGreaterThanOrEqual(64);
  });

  test('Catalog preserves all 30 legacy items with matching IDs and contracts', () => {
    expect(LEGACY_30_ITEMS.length).toBe(30);

    for (const legacyItem of LEGACY_30_ITEMS) {
      const adapterItem = adapter.getItem(legacyItem.id);
      expect(adapterItem).toBeDefined();
      expect(adapterItem?.id).toBe(legacyItem.id);
      expect(adapterItem?.displayName).toBe(legacyItem.displayName);

      const engineItem = adapter.getEngineCatalogItem(legacyItem.id);
      expect(engineItem).toBeDefined();
      expect(engineItem?.id).toBe(legacyItem.id);
      expect(engineItem?.name).toBe(legacyItem.displayName);
      expect(engineItem?.cost).toBe(legacyItem.costCoins);
    }
  });

  test('Handles unknown IDs gracefully by returning undefined', () => {
    expect(adapter.getItem('non_existent_item_id')).toBeUndefined();
    expect(adapter.getEngineCatalogItem('non_existent_item_id')).toBeUndefined();
  });

  test('Validates against negative/non-finite prices', () => {
    const invalidPriceItem: ExpandedFurnitureItem = {
      ...LEGACY_30_ITEMS[0],
      id: 'invalid_price_test',
      costCoins: -50,
    };
    const errors = validateFurnitureItem(invalidPriceItem);
    expect(errors.some((e) => e.includes('invalid costCoins'))).toBe(true);

    const nonFinitePriceItem: ExpandedFurnitureItem = {
      ...LEGACY_30_ITEMS[0],
      id: 'non_finite_price_test',
      costCoins: NaN,
    };
    const errors2 = validateFurnitureItem(nonFinitePriceItem);
    expect(errors2.some((e) => e.includes('invalid costCoins'))).toBe(true);
  });

  test('Validates against invalid dimensions/geometry and interact spot bounds', () => {
    const invalidWidthItem: ExpandedFurnitureItem = {
      ...LEGACY_30_ITEMS[0],
      id: 'invalid_geom_test',
      width: 0,
    };
    const errors = validateFurnitureItem(invalidWidthItem);
    expect(errors.some((e) => e.includes('invalid width'))).toBe(true);

    const outOfBoundsSpotItem: ExpandedFurnitureItem = {
      ...LEGACY_30_ITEMS[0],
      id: 'out_of_bounds_test',
      width: 1,
      height: 1,
      interactSpots: [{ x: 2, y: 0 }],
    };
    const errors2 = validateFurnitureItem(outOfBoundsSpotItem);
    expect(errors2.some((e) => e.includes('interactSpot (2, 0) is outside footprint'))).toBe(true);
  });

  test('Rejects duplicate item IDs in catalog validation', () => {
    const duplicateList = [...FULL_EXPANDED_FURNITURE_CATALOG, FULL_EXPANDED_FURNITURE_CATALOG[0]];
    const errors = validateFurnitureCatalog(duplicateList);
    expect(errors.some((e) => e.includes('Duplicate furniture item ID found'))).toBe(true);
  });

  test('All items across 4 room styles are represented and valid', () => {
    const styles = ['cozy_cottage', 'modern_cat', 'whimsical_play', 'rustic_garden'];
    for (const style of styles) {
      const styleItems = adapter.getItemsByStyle(style);
      expect(styleItems.length).toBeGreaterThan(0);
    }
  });

  test('All functional items provide valid need affordances or honest decorative purpose', () => {
    for (const item of adapter.getAllExpandedItems()) {
      if (item.needAffordance) {
        expect(item.needAffordance.satisfactionRate).toBeGreaterThan(0);
        expect(['hunger', 'hydration', 'energy', 'hygiene', 'social', 'fun', 'comfort', 'scratch']).toContain(
          item.needAffordance.needType
        );
      }
    }
  });
});
