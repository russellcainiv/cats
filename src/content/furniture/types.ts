export type RoomStyleCategory =
  | 'cozy_cottage'
  | 'modern_cat'
  | 'whimsical_play'
  | 'rustic_garden';

export type FurnitureCategory =
  | 'seating'
  | 'sleep'
  | 'care'
  | 'play'
  | 'skills'
  | 'storage'
  | 'decor'
  | 'kitchen'
  | 'outdoor';

export type NeedType =
  | 'hunger'
  | 'hydration'
  | 'energy'
  | 'hygiene'
  | 'social'
  | 'fun'
  | 'comfort'
  | 'scratch';

export interface NeedAffordance {
  needType: NeedType;
  satisfactionRate: number; // Positive rate per sim minute or action step
  description?: string;
}

export interface InteractSpot {
  x: number;
  y: number;
  label?: string;
}

export type ArtAtlasKey =
  | 'atlas01'
  | 'atlas02'
  | 'atlas03'
  | 'atlas04'
  | 'legacy'
  | 'none';

export type ArtStatus = 'verified_atlas' | 'art_needed';

export interface UnlockRequirement {
  minGoalsCompleted?: number;
  requiredGoalId?: string;
  minWalletCoinsEarned?: number;
}

export interface ExpandedFurnitureItem {
  id: string;
  displayName: string;
  category: FurnitureCategory;
  style: RoomStyleCategory;
  costCoins: number;
  width: number;
  height: number;
  isSolid: boolean;
  requiresWall?: boolean;
  allowedRotations: (0 | 90 | 180 | 270)[];
  interactSpots: InteractSpot[];
  paletteVariants: string[];
  unlockRequirement?: UnlockRequirement;
  placementType: 'floor' | 'wall' | 'surface';
  needAffordance?: NeedAffordance;
  description: string;
  assetKey: string;
  atlas: ArtAtlasKey;
  atlasIndex?: number; // 0..15 in 4x4 layout
  artStatus: ArtStatus;
  schemaVersion: number;
}

/**
  Engine compatibility CatalogItem interface
 */
export interface EngineCatalogItem {
  id: string;
  name: string;
  category: string;
  cost: number;
  width: number;
  height: number;
  colorVariants: string[];
  interactSpots: { x: number; y: number }[];
  requiresWall?: boolean;
  description: string;
  // Extended optional properties for engines that leverage rich content metadata
  style?: string;
  isSolid?: boolean;
  needAffordance?: NeedAffordance;
  assetKey?: string;
  atlas?: string;
  artStatus?: string;
  schemaVersion?: number;
}
