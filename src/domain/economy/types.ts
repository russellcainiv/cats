// src/domain/economy/types.ts

export type MoneyProvenance = 'earned' | 'free_build';

export type CareerId = 'cafe_assistant' | 'garden_keeper' | 'gallery_helper';
export type WorkStatus = 'off_work' | 'departing' | 'working' | 'returning';

export interface OutfitDefinition {
  id: string;
  name: string;
  hat?: string;
  body?: string;
  description: string;
}

export const CAREER_OUTFITS: Record<CareerId, OutfitDefinition> = {
  cafe_assistant: {
    id: 'cafe_apron',
    name: 'Café Apron',
    body: 'apron_green',
    description: 'A cozy green apron suitable for serving coffee and treats.'
  },
  garden_keeper: {
    id: 'gardener_overalls_sunhat',
    name: 'Gardener Overalls & Sunhat',
    hat: 'sunhat_straw',
    body: 'overalls_denim',
    description: 'Sturdy denim overalls and a sunhat to protect against the sun.'
  },
  gallery_helper: {
    id: 'gallery_helper_smock_beret',
    name: 'Gallery Smock & Beret',
    hat: 'beret_red',
    body: 'smock_artist',
    description: 'An artistic smock and stylish red beret for gallery work.'
  }
};

export interface CareerOutfit {
  outfitId: string;
  careerId: string;
  rank: number;
}

export interface CatWorkState {
  catId: string;
  careerId: CareerId;
  status: WorkStatus;
  shiftStartSimMinute: number;
  shiftEndSimMinute: number;
  currentOutfitId: string | null;
  lastPaidSimMinute: number;
  daysWorked: number;
  missedShifts: number;
  commuteUntilSimMinute?: number;
}

export interface CareerRankConfig {
  rank: 1 | 2 | 3;
  title: string;
  hourlyWage: number;
  requiredSkill: 'painting' | 'gardening' | 'social';
  requiredSkillLevel: number;
  requiredDaysWorked: number;
  requiredPerformance: number;
  shiftStartHour: number; // e.g. 8 for 08:00
  shiftEndHour: number;   // e.g. 16 for 16:00
  workDays: number[];     // e.g. [1, 2, 3, 4, 5] (Mon-Fri, 0 = Sun)
}

export interface CareerConfig {
  id: CareerId;
  name: string;
  outfit: OutfitDefinition;
  ranks: CareerRankConfig[];
}

export interface CareerRecord {
  catId: string;
  careerId: CareerId;
  rank: 1 | 2 | 3;
  shiftStartHour: number;
  shiftEndHour: number;
  workDays: number[];
  performance: number; // 0 - 100
  title?: string;
  hourlyWage?: number;
  isAtWork?: boolean;
}

export interface Artwork {
  id: string;
  artistCatId: string;
  title: string;
  quality: 'basic' | 'fine' | 'masterpiece';
  value: number;
  createdAtSimMinute: number;
  provenance: MoneyProvenance;
  isDisplayed: boolean;
  lotId?: string;
  x?: number;
  y?: number;
}

export interface EaselState {
  easelObjectId: string;
  currentCatId: string | null;
  progressMinutes: number;
  targetMinutes: number;
  artworkTitle?: string;
  provenance?: MoneyProvenance;
}

export type CropType = 'tomato' | 'strawberry' | 'catnip';

export interface CropConfig {
  type: CropType;
  name: string;
  seedCost: number;
  growthTimeMinutes: number;
  waterIntervalMinutes: number;
  baseYield: number;
  baseSellPrice: number;
  requiredSkillLevel: number;
}

export interface GardenPlotState {
  plotObjectId: string;
  cropType: CropType | null;
  plantedAtSimMinute: number | null;
  lastWateredSimMinute: number | null;
  growthProgressMinutes: number;
  isWithered: boolean;
  isHarvestable: boolean;
  provenance: MoneyProvenance;
}

export interface CafeRecipe {
  id: string;
  name: string;
  costToStock: number;
  sellPrice: number;
  unlocked: boolean;
  requiredSkillLevel: number;
}

export interface CafeCustomerOrder {
  orderId: string;
  customerId: string;
  recipeId: string;
  orderedAtSimMinute: number;
  expiresAtSimMinute: number;
  fulfilled: boolean;
}

export interface CafeExtensionState {
  owned: boolean;
  purchaseCost: number;
  isOpen: boolean;
  reputation: number;
  totalRevenue: number;
  totalExpenses: number;
  activeOrders: CafeCustomerOrder[];
  customerQueue: string[];
  lastOrderCheckSimMinute: number;
  totalOrdersServed: number;
  totalOrdersCreated: number;
}

export type GoalCategory = 'care' | 'relationships' | 'building' | 'work' | 'hobbies' | 'business' | 'neighborhood' | 'legacy';

export interface GoalDefinition {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  target: number;
  rewardCash: number;
}

export interface EconomyStats {
  artworksPainted: number;
  artworksSold: number;
  masterpiecesPainted: number;
  cropsHarvested: Record<string, number>;
  totalCropsHarvested: number;
  careActionsCompleted: number;
  shiftsWorkedTotal: number;
}

export interface EconomyExtensionState {
  workStates: Record<string, CatWorkState>;
  easels: Record<string, EaselState>;
  artworks: Record<string, Artwork>;
  gardenPlots: Record<string, GardenPlotState>;
  cafeDetails: CafeExtensionState;
  claimedGoalRewards: Record<string, boolean>;
  stats?: EconomyStats;
}

// Commands
export type EconomyCommand =
  | { type: 'JOIN_CAREER'; payload: { catId: string; careerId: CareerId } }
  | { type: 'LEAVE_CAREER'; payload: { catId: string } }
  | { type: 'START_WORK_SHIFT'; payload: { catId: string; staged?: boolean } }
  | { type: 'DEPART_FOR_WORK'; payload: { catId: string } }
  | { type: 'ARRIVE_AT_WORK'; payload: { catId: string } }
  | { type: 'RETURN_FROM_WORK'; payload: { catId: string } }
  | { type: 'FINISH_WORK_SHIFT'; payload: { catId: string } }
  | { type: 'CANCEL_WORK_SHIFT'; payload: { catId: string } }
  | { type: 'PROMOTE_CAREER'; payload: { catId: string } }
  | { type: 'START_PAINTING'; payload: { catId: string; easelObjectId: string; title?: string } }
  | { type: 'PROGRESS_PAINTING'; payload: { catId: string; easelObjectId: string; elapsedMinutes: number } }
  | { type: 'FINISH_PAINTING'; payload: { catId: string; easelObjectId: string } }
  | { type: 'DISPLAY_ARTWORK'; payload: { artworkId: string; lotId: string; x: number; y: number } }
  | { type: 'SELL_ARTWORK'; payload: { artworkId: string } }
  | { type: 'PLANT_CROP'; payload: { plotObjectId: string; cropType: CropType } }
  | { type: 'WATER_CROP'; payload: { plotObjectId: string } }
  | { type: 'HARVEST_CROP'; payload: { plotObjectId: string } }
  | { type: 'SELL_ITEM'; payload: { itemId: string; quantity: number } }
  | { type: 'BUY_ITEM'; payload: { catalogId: string; quantity: number } }
  | { type: 'BUY_CAFE_BUSINESS'; payload: Record<string, never> }
  | { type: 'SET_CAFE_OPEN'; payload: { open: boolean } }
  | { type: 'RESTOCK_CAFE'; payload: { recipeId: string; amount: number } }
  | { type: 'SERVE_CAFE_CUSTOMER'; payload: { orderId: string } }
  | { type: 'CLAIM_GOAL_REWARD'; payload: { goalId: string } };

export interface OutfitProjection {
  catId: string;
  isWorking: boolean;
  careerId: CareerId | null;
  outfitId: string | null;
  outfitDetails: OutfitDefinition | null;
}
