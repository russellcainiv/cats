/**
 * Needs, Mood Dynamics, and Health Warnings
 */

import {
  CatNeeds,
  MoodBand,
  NEED_DECAY_RATES,
  PersonalityTrait,
} from '../state';

export function clamp(value: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateMood(
  needs: CatNeeds,
  traits: readonly PersonalityTrait[] = []
): { score: number; band: MoodBand } {
  // Weighted composite score (0 - 100)
  const weighted =
    needs.hunger * 0.25 +
    needs.energy * 0.20 +
    needs.health * 0.20 +
    needs.comfort * 0.10 +
    needs.social * 0.10 +
    needs.fun * 0.10 +
    needs.hygiene * 0.05;

  let traitModifier = 0;
  if (traits.includes('zen')) traitModifier += 3;
  if (traits.includes('glutton') && needs.hunger < 30) traitModifier -= 5;
  if (traits.includes('affectionate') && needs.social < 30) traitModifier -= 5;

  const score = Math.round(clamp(weighted + traitModifier));

  let band: MoodBand;
  if (score < 20) {
    band = 'miserable';
  } else if (score < 40) {
    band = 'low';
  } else if (score < 70) {
    band = 'okay';
  } else if (score < 90) {
    band = 'happy';
  } else {
    band = 'ecstatic';
  }

  return { score, band };
}

export interface NeedsAdvanceResult {
  needs: CatNeeds;
  moodScore: number;
  moodBand: MoodBand;
  neglectHealthLoss: boolean;
  warnings: string[];
}

export function advanceNeeds(
  currentNeeds: CatNeeds,
  traits: readonly PersonalityTrait[],
  elapsedMinutes: number
): NeedsAdvanceResult {
  if (elapsedMinutes <= 0) {
    const { score, band } = calculateMood(currentNeeds, traits);
    return {
      needs: { ...currentNeeds },
      moodScore: score,
      moodBand: band,
      neglectHealthLoss: false,
      warnings: [],
    };
  }

  // Calculate trait multiplier factors
  let hungerMultiplier = 1.0;
  let energyMultiplier = 1.0;
  let funMultiplier = 1.0;
  let socialMultiplier = 1.0;
  let comfortMultiplier = 1.0;
  let healthMultiplier = 1.0;

  if (traits.includes('glutton')) hungerMultiplier *= 1.25;
  if (traits.includes('lazy')) energyMultiplier *= 0.8;
  if (traits.includes('playful')) funMultiplier *= 1.25;
  if (traits.includes('aloof')) socialMultiplier *= 0.7;
  if (traits.includes('affectionate')) socialMultiplier *= 1.3;
  if (traits.includes('zen')) {
    comfortMultiplier *= 0.8;
    healthMultiplier *= 0.8;
  }

  // Decay base needs
  const hunger = clamp(currentNeeds.hunger - NEED_DECAY_RATES.hunger * hungerMultiplier * elapsedMinutes);
  const hygiene = clamp(currentNeeds.hygiene - NEED_DECAY_RATES.hygiene * elapsedMinutes);
  const energy = clamp(currentNeeds.energy - NEED_DECAY_RATES.energy * energyMultiplier * elapsedMinutes);
  const comfort = clamp(currentNeeds.comfort - NEED_DECAY_RATES.comfort * comfortMultiplier * elapsedMinutes);
  const social = clamp(currentNeeds.social - NEED_DECAY_RATES.social * socialMultiplier * elapsedMinutes);
  const fun = clamp(currentNeeds.fun - NEED_DECAY_RATES.fun * funMultiplier * elapsedMinutes);

  // Health dynamics
  let healthDelta = 0;
  let neglectHealthLoss = false;

  // Severe neglect causes accelerated health loss
  if (hunger <= 10 || hygiene <= 10 || energy <= 5) {
    neglectHealthLoss = true;
    healthDelta -= 0.05 * healthMultiplier * elapsedMinutes;
  } else if (hunger < 25 || hygiene < 25) {
    healthDelta -= NEED_DECAY_RATES.health * healthMultiplier * elapsedMinutes;
  } else if (currentNeeds.health > 0 && hunger >= 60 && hygiene >= 60 && energy >= 50 && comfort >= 50) {
    // Healthy recovery (only if cat is still alive with health > 0)
    healthDelta += 0.02 * elapsedMinutes;
  }

  const health = clamp(currentNeeds.health + healthDelta);

  const updatedNeeds: CatNeeds = {
    hunger,
    hygiene,
    energy,
    comfort,
    social,
    fun,
    health,
  };

  const { score: moodScore, band: moodBand } = calculateMood(updatedNeeds, traits);

  // Check warnings
  const warnings: string[] = [];
  if (health <= 35) {
    warnings.push(`Health danger: ${Math.round(health)}/100`);
  }
  if (hunger <= 20) warnings.push('Extreme hunger');
  if (energy <= 20) warnings.push('Extreme exhaustion');
  if (hygiene <= 20) warnings.push('Litter box/hygiene urgent');

  return {
    needs: updatedNeeds,
    moodScore,
    moodBand,
    neglectHealthLoss,
    warnings,
  };
}

export function applyCareSatisfaction(
  needs: CatNeeds,
  traits: readonly PersonalityTrait[],
  careType: 'eat' | 'sleep' | 'litter' | 'groom' | 'scratch' | 'play'
): CatNeeds {
  let hungerBoost = 0;
  let hygieneBoost = 0;
  let energyBoost = 0;
  let comfortBoost = 0;
  let socialBoost = 0;
  let funBoost = 0;
  let healthBoost = 0;

  switch (careType) {
    case 'eat':
      hungerBoost = traits.includes('glutton') ? 60 : 50;
      comfortBoost = 10;
      energyBoost = 5;
      break;
    case 'sleep':
      energyBoost = traits.includes('lazy') ? 70 : 60;
      comfortBoost = 20;
      healthBoost = 5;
      break;
    case 'litter':
      hygieneBoost = 45;
      comfortBoost = 15;
      break;
    case 'groom':
      hygieneBoost = 35;
      comfortBoost = 15;
      socialBoost = traits.includes('affectionate') ? 15 : 5;
      break;
    case 'scratch':
      funBoost = 30;
      comfortBoost = 15;
      break;
    case 'play':
      funBoost = traits.includes('playful') ? 60 : 50;
      socialBoost = 20;
      energyBoost = -10;
      break;
  }

  return {
    hunger: clamp(needs.hunger + hungerBoost),
    hygiene: clamp(needs.hygiene + hygieneBoost),
    energy: clamp(needs.energy + energyBoost),
    comfort: clamp(needs.comfort + comfortBoost),
    social: clamp(needs.social + socialBoost),
    fun: clamp(needs.fun + funBoost),
    health: clamp(needs.health + healthBoost),
  };
}
