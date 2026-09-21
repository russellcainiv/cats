export type AccessoryType = 'collar' | 'bowtie' | 'bandana' | 'scarf' | 'bell';

export interface AccessoryItem {
  id: string;
  displayName: string;
  type: AccessoryType;
  costCoins: number;
  paletteVariants: string[];
  description: string;
  assetKey: string;
}

export type CareerTrackId = 'cafe_assistant' | 'garden_keeper' | 'gallery_helper';

export interface CareerOutfitItem {
  id: string;
  careerTrackId: CareerTrackId;
  rank: 1 | 2 | 3;
  displayName: string;
  paletteVariant: string;
  description: string;
  assetKey: string;
}

export interface CoatVariant {
  id: string;
  displayName: string;
  category: 'tabby' | 'calico' | 'spotted' | 'solid' | 'bicolor' | 'pointed';
  assetKey: string;
}

export interface EyeColorPalette {
  id: string;
  displayName: string;
  hexCode: string;
}

export interface RoomSwatch {
  id: string;
  displayName: string;
  category: 'wallpaper' | 'flooring';
  style: 'cozy_cottage' | 'modern_cat' | 'whimsical_play' | 'rustic_garden';
  costCoins: number;
  hexColor: string;
  textureAssetKey: string;
}

/**
 * Immutable base genetics representation of a cat.
 * Customization overlays MUST NEVER mutate these fields.
 */
export interface BaseGeneticAppearance {
  breedId: string;
  coatVariantId: string;
  eyeColorId: string;
  ancestryIds: string[];
}

/**
 * Active wardrobe outfit state for a cat.
 */
export interface CatWardrobeState {
  catId: string;
  baseGenetics: BaseGeneticAppearance;
  equippedAccessoryId?: string;
  equippedAccessoryPalette?: string;
  activeJobId?: CareerTrackId;
  activeJobRank?: 1 | 2 | 3;
  isOnShift: boolean;
  ownedAccessoryIds: string[];
}

export interface RenderedCatLook {
  catId: string;
  baseGenetics: BaseGeneticAppearance;
  activeAccessory?: {
    id: string;
    type: AccessoryType;
    palette: string;
    assetKey: string;
  };
  activeCareerOutfit?: {
    id: string;
    careerTrackId: CareerTrackId;
    rank: 1 | 2 | 3;
    assetKey: string;
  };
  isQuadrupedWithPaws: true; // Invariant check flag
}
