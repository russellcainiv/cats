/**
 * Collection Probability & Odds Calculations
 *
 * Owned path: src/domain/collection/odds.ts
 */

import { CatCatalogEntry, GameRarityTier } from '../../content/cats/types';
import { ALL_CAT_CATALOG } from '../../content/cats/catalog';
import { ClassOddsWeights, DiscoveryContext, InjectedRNG } from './types';

export const DEFAULT_CLASS_WEIGHTS: ClassOddsWeights = {
  common: 70,
  uncommon: 24,
  rare_domestic: 5,
  wild: 0.75,
  fantasy: 0.25,
};

export interface EffectiveProbabilities {
  tierWeights: Record<GameRarityTier, number>;
  tierEffectivePercentages: Record<GameRarityTier, number>;
  eligibleCandidatesByTier: Record<GameRarityTier, number>;
  totalEligibleCount: number;
}

/**
 * Filter catalog candidates based on location, time, weather, and prerequisites.
 */
export function getEligibleCandidates(
  context: DiscoveryContext,
  catalog: CatCatalogEntry[] = ALL_CAT_CATALOG
): CatCatalogEntry[] {
  return catalog.filter((entry) => {
    const conds = entry.eligibleDiscoveryConditions;

    // Location match
    if (!conds.locationIds.includes(context.locationId)) {
      return false;
    }

    // Time match
    if (conds.timeOfDay && conds.timeOfDay !== 'any' && context.timeOfDay) {
      if (conds.timeOfDay !== context.timeOfDay) {
        return false;
      }
    }

    // Weather match
    if (conds.weatherCondition && conds.weatherCondition !== 'any' && context.weatherCondition) {
      if (conds.weatherCondition !== context.weatherCondition) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Compute effective percentages for eligible categories/rarity tiers.
 */
export function calculateEffectiveProbabilities(
  eligibleCandidates: CatCatalogEntry[],
  weights: ClassOddsWeights = DEFAULT_CLASS_WEIGHTS
): EffectiveProbabilities {
  const eligibleCandidatesByTier: Record<GameRarityTier, number> = {
    common: 0,
    uncommon: 0,
    rare_domestic: 0,
    wild: 0,
    fantasy: 0,
  };

  for (const candidate of eligibleCandidates) {
    eligibleCandidatesByTier[candidate.gameRarity]++;
  }

  let activeWeightSum = 0;
  const activeWeights: Record<GameRarityTier, number> = {
    common: 0,
    uncommon: 0,
    rare_domestic: 0,
    wild: 0,
    fantasy: 0,
  };

  for (const tier of Object.keys(eligibleCandidatesByTier) as GameRarityTier[]) {
    if (eligibleCandidatesByTier[tier] > 0) {
      activeWeights[tier] = weights[tier];
      activeWeightSum += weights[tier];
    }
  }

  const tierEffectivePercentages: Record<GameRarityTier, number> = {
    common: 0,
    uncommon: 0,
    rare_domestic: 0,
    wild: 0,
    fantasy: 0,
  };

  if (activeWeightSum > 0) {
    for (const tier of Object.keys(activeWeights) as GameRarityTier[]) {
      tierEffectivePercentages[tier] = (activeWeights[tier] / activeWeightSum) * 100;
    }
  }

  return {
    tierWeights: activeWeights,
    tierEffectivePercentages,
    eligibleCandidatesByTier,
    totalEligibleCount: eligibleCandidates.length,
  };
}

/**
 * Deterministically roll an eligible candidate using injected RNG.
 * Guaranteed not to enter unbounded loops.
 */
export function drawCandidateFromPool(
  eligibleCandidates: CatCatalogEntry[],
  rng: InjectedRNG,
  weights: ClassOddsWeights = DEFAULT_CLASS_WEIGHTS
): CatCatalogEntry | null {
  if (eligibleCandidates.length === 0) {
    return null;
  }

  const odds = calculateEffectiveProbabilities(eligibleCandidates, weights);

  // Convert float weights to integer scaled range for discrete RNG draw
  const SCALE = 10000;
  let totalScaled = 0;
  const tierRanges: Array<{ tier: GameRarityTier; min: number; max: number }> = [];

  for (const tier of Object.keys(odds.tierWeights) as GameRarityTier[]) {
    const weight = odds.tierWeights[tier];
    if (weight > 0) {
      const scaled = Math.round(weight * SCALE);
      tierRanges.push({
        tier,
        min: totalScaled + 1,
        max: totalScaled + scaled,
      });
      totalScaled += scaled;
    }
  }

  if (totalScaled === 0) {
    return null;
  }

  // Draw scaled value
  const drawnVal = rng(1, totalScaled);

  // Find selected tier
  const selectedTierObj = tierRanges.find((r) => drawnVal >= r.min && drawnVal <= r.max);
  const selectedTier = selectedTierObj ? selectedTierObj.tier : tierRanges[0].tier;

  // Filter candidates belonging to selected tier
  const tierCandidates = eligibleCandidates.filter((c) => c.gameRarity === selectedTier);

  if (tierCandidates.length === 0) {
    // Fallback safely to any eligible candidate without infinite loop
    const fallbackIdx = rng(0, eligibleCandidates.length - 1);
    return eligibleCandidates[fallbackIdx];
  }

  const candidateIdx = rng(0, tierCandidates.length - 1);
  return tierCandidates[candidateIdx];
}
