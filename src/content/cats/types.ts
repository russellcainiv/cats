/**
 * Cat Catalog and Dex Schema Definitions
 *
 * Owned path: src/content/cats/types.ts
 */

export type CatCategory = 'domestic' | 'wild' | 'fantasy';

export type GameRarityTier =
  | 'common'
  | 'uncommon'
  | 'rare_domestic'
  | 'wild'
  | 'fantasy';

export type ArtAssetStatus = 'batch_seed_ready' | 'art_needed';

export interface AppearanceFlags {
  coatLength: 'short' | 'medium' | 'long' | 'hairless';
  coatPattern: 'solid' | 'tabby' | 'tuxedo' | 'calico' | 'tortoiseshell' | 'colorpoint' | 'spotted' | 'bicolor' | 'rosette' | 'mystic_glow';
  bodyBuild: 'slender' | 'medium' | 'cobbly' | 'muscular' | 'compact' | 'wild_large' | 'wild_small' | 'ethereal';
  earType: 'straight' | 'folded' | 'curled' | 'tufted' | 'large_pointed' | 'rounded';
  tailType: 'full' | 'bobbed' | 'plumed' | 'ringed' | 'ethereal_whisps';
  primaryColor: string;
  secondaryColor?: string;
  eyeColor: string;
}

export interface DiscoveryConditions {
  minSimMinutesSpent?: number;
  timeOfDay?: 'day' | 'night' | 'dusk' | 'any';
  locationIds: string[];
  weatherCondition?: 'clear' | 'foggy' | 'starlight' | 'rain' | 'any';
  requiredBefriendLevel?: number; // 0..100 needed for recruitment
}

export interface ContentProvenance {
  sourceOrganization: 'TICA' | 'CFA' | 'GameOriginal' | 'FelineTaxonomy';
  citationUrl?: string;
  referenceNotes: string;
}

export interface CatCatalogEntry {
  id: string;
  displayName: string;
  category: CatCategory;
  gameRarity: GameRarityTier;
  eligibleDiscoveryLocations: string[];
  eligibleDiscoveryConditions: DiscoveryConditions;
  appearanceFlags: AppearanceFlags;
  portraitAssetKey: string;
  bodyAssetKey: string;
  animationAssetKeys: string[];
  artStatus: ArtAssetStatus;
  creatorAllowed: boolean;
  ancestryEligibility: boolean;
  discoveryHints: string;
  description: string;
  provenance: ContentProvenance;
}

export interface CatalogSummary {
  totalDomesticBreeds: number;
  totalDomesticCoatVariants: number;
  totalWildTypes: number;
  totalFantasyForms: number;
  batchSeedCount: number;
  artNeededCount: number;
}
