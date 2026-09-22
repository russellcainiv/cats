/**
 * Collection Domain Types and Interfaces
 *
 * Owned path: src/domain/collection/types.ts
 */

import { CatCategory, GameRarityTier } from '../../content/cats/types';

/**
 * Injected pure RNG function interface.
 * Returns an integer between min and max inclusive.
 * Must NOT rely on Math.random or Date.now.
 */
export type InjectedRNG = (min: number, max: number) => number;

export interface EncounterState {
  encounterId: string;
  catalogId: string;
  category: CatCategory;
  gameRarity: GameRarityTier;
  locationId: string;
  spawnSimMinute: number;
  friendshipPoints: number; // 0..100
  discovered: boolean;
  befriended: boolean;
  recruited: boolean;
  recruitedHouseholdId?: string;
  recruitedAtSimMinute?: number;
}

export interface DexDiscoveryRecord {
  catalogId: string;
  firstDiscoveredSimMinute: number;
  totalEncounters: number;
  maxFriendshipAchieved: number;
  isRecruited: boolean;
  recruitedCatId?: string;
}

export interface HouseholdCapacityAdapter {
  householdId: string;
  livingCount: number;
  reservedLitterSlots: number;
  maxCapacity: number; // default 8 (4 per player)
}

export interface ClassOddsWeights {
  common: number;      // default 70
  uncommon: number;    // default 24
  rare_domestic: number; // default 5
  wild: number;        // default 0.75
  fantasy: number;     // default 0.25
}

export interface DiscoveryContext {
  simMinute: number;
  locationId: string;
  timeOfDay?: 'day' | 'night' | 'dusk' | 'any';
  weatherCondition?: 'clear' | 'foggy' | 'starlight' | 'rain' | 'any';
  activeExplorationMinutes: number; // Active time spent exploring
}

export interface CollectionDexState {
  version: number;
  discoveries: Record<string, DexDiscoveryRecord>; // catalogId -> record
  encounters: Record<string, EncounterState>; // encounterId -> encounter
  lastScheduleCheckSimMinute: number;
  cooldownUntilSimMinute: number;
}

export type CollectionAction =
  | { type: 'SCHEDULE_EXPLORATION_CHECK'; context: DiscoveryContext }
  | { type: 'BEFRIEND_ENCOUNTER'; encounterId: string; points: number; simMinute: number }
  | { type: 'RECRUIT_ENCOUNTER'; encounterId: string; actorId: string; householdAdapter: HouseholdCapacityAdapter; simMinute: number };

export interface CollectionActionResult {
  success: boolean;
  actionType: string;
  encounter?: EncounterState;
  newCatId?: string;
  error?: string;
  state: CollectionDexState;
}
