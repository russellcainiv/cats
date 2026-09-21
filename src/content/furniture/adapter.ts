import { ExpandedFurnitureItem, EngineCatalogItem } from './types';
import { FULL_EXPANDED_FURNITURE_CATALOG } from './expanded_catalog';
import { toEngineCatalogItem, validateFurnitureCatalog } from './validation';

export class FurnitureCatalogAdapter {
  private catalogMap: Map<string, ExpandedFurnitureItem>;
  private engineCatalogMap: Map<string, EngineCatalogItem>;

  constructor(items: ExpandedFurnitureItem[] = FULL_EXPANDED_FURNITURE_CATALOG) {
    const validationErrors = validateFurnitureCatalog(items);
    if (validationErrors.length > 0) {
      throw new Error(`Furniture catalog validation failed:\n${validationErrors.join('\n')}`);
    }

    this.catalogMap = new Map();
    this.engineCatalogMap = new Map();

    for (const item of items) {
      this.catalogMap.set(item.id, item);
      this.engineCatalogMap.set(item.id, toEngineCatalogItem(item));
    }
  }

  /**
   * Retrieves an item by ID in full ExpandedFurnitureItem format.
   * Returns undefined if unknown ID.
   */
  public getItem(id: string): ExpandedFurnitureItem | undefined {
    return this.catalogMap.get(id);
  }

  /**
   * Retrieves an item in standard EngineCatalogItem format for engine compatibility.
   * Returns undefined if unknown ID.
   */
  public getEngineCatalogItem(id: string): EngineCatalogItem | undefined {
    return this.engineCatalogMap.get(id);
  }

  /**
   * Returns all items formatted as EngineCatalogItem array.
   */
  public getAllEngineCatalogItems(): EngineCatalogItem[] {
    return Array.from(this.engineCatalogMap.values());
  }

  /**
   * Returns all items formatted as ExpandedFurnitureItem array.
   */
  public getAllExpandedItems(): ExpandedFurnitureItem[] {
    return Array.from(this.catalogMap.values());
  }

  /**
   * Filter items by room style category.
   */
  public getItemsByStyle(style: string): ExpandedFurnitureItem[] {
    return Array.from(this.catalogMap.values()).filter((item) => item.style === style);
  }

  /**
   * Returns total count of furniture items registered in catalog.
   */
  public get size(): number {
    return this.catalogMap.size;
  }
}

export const defaultFurnitureAdapter = new FurnitureCatalogAdapter();
