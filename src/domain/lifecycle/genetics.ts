// src/domain/lifecycle/genetics.ts
// Genetics, trait inheritance, and seeded PRNG helpers for kitten generation.

import { CatAppearance, PersonalityTrait, CatRecord, RngStateData } from './types';

export const ALL_TRAITS: PersonalityTrait[] = [
  'playful',
  'lazy',
  'glutton',
  'curious',
  'affectionate',
  'skittish',
  'vocal',
  'adventurous',
];

/**
 * Deterministic pseudo-random number generator (LCG) using world state's RNG seed/counter.
 * Returns a tuple of [randomValue (0..1), updatedRngState].
 */
export function nextRng(rng: RngStateData): [number, RngStateData] {
  const seed = rng.seed ?? 12345;
  const counter = (rng.counter ?? 0) + 1;
  // LCG step
  const nextVal = (seed * 1664525 + counter * 1013904223) % 4294967296;
  const normalized = Math.abs(nextVal) / 4294967296;

  return [
    normalized,
    {
      ...rng,
      counter,
    },
  ];
}

/**
 * Generate inherited appearance for a kitten from dam and sire using seeded PRNG.
 */
export function inheritAppearance(
  dam: CatRecord,
  sire: CatRecord | null,
  rng: RngStateData
): [CatAppearance, RngStateData] {
  let currentRng = rng;
  let val: number;

  const sireApp = sire?.appearance || dam.appearance;

  // Coat Color
  [val, currentRng] = nextRng(currentRng);
  const coatColor = val < 0.45 ? dam.appearance.coatColor : val < 0.9 ? sireApp.coatColor : 'calico';

  // Coat Pattern
  [val, currentRng] = nextRng(currentRng);
  const coatPattern = val < 0.5 ? dam.appearance.coatPattern : sireApp.coatPattern;

  // Eye Color
  [val, currentRng] = nextRng(currentRng);
  const eyeColor = val < 0.5 ? dam.appearance.eyeColor : sireApp.eyeColor;

  return [
    {
      coatColor,
      coatPattern,
      eyeColor,
    },
    currentRng,
  ];
}

/**
 * Generate inherited traits for a kitten from dam and sire using seeded PRNG.
 */
export function inheritTraits(
  dam: CatRecord,
  sire: CatRecord | null,
  rng: RngStateData
): [PersonalityTrait[], RngStateData] {
  let currentRng = rng;
  let val: number;

  const traitsSet = new Set<PersonalityTrait>();

  // Pick 1 trait from dam
  if (dam.traits && dam.traits.length > 0) {
    [val, currentRng] = nextRng(currentRng);
    const idx = Math.floor(val * dam.traits.length);
    traitsSet.add(dam.traits[idx]);
  }

  // Pick 1 trait from sire (if available)
  if (sire && sire.traits && sire.traits.length > 0) {
    [val, currentRng] = nextRng(currentRng);
    const idx = Math.floor(val * sire.traits.length);
    traitsSet.add(sire.traits[idx]);
  }

  // Fill up to 2 traits if needed from ALL_TRAITS
  while (traitsSet.size < 2) {
    [val, currentRng] = nextRng(currentRng);
    const idx = Math.floor(val * ALL_TRAITS.length);
    traitsSet.add(ALL_TRAITS[idx]);
  }

  return [Array.from(traitsSet), currentRng];
}
