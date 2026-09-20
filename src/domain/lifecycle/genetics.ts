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

export { nextRng, SeededRng, createRngAdapter, toRngStateData } from './rng';
import { nextRng } from './rng';

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
  const damApp = dam.appearance;

  // Primary Color / Coat Color
  const damPrimary = damApp.primaryColor ?? damApp.coatColor ?? '#F5E6D3';
  const sirePrimary = sireApp.primaryColor ?? sireApp.coatColor ?? damPrimary;
  [val, currentRng] = nextRng(currentRng);
  const primaryColor = val < 0.45 ? damPrimary : val < 0.9 ? sirePrimary : damPrimary;

  // Coat Pattern
  const damPattern = damApp.pattern ?? (damApp.coatPattern as any) ?? 'tabby';
  const sirePattern = sireApp.pattern ?? (sireApp.coatPattern as any) ?? damPattern;
  [val, currentRng] = nextRng(currentRng);
  const pattern = val < 0.5 ? damPattern : sirePattern;

  // Breed
  const damBreed = damApp.breed ?? 'domestic_shorthair';
  const sireBreed = sireApp.breed ?? damBreed;
  [val, currentRng] = nextRng(currentRng);
  const breed = val < 0.5 ? damBreed : sireBreed;

  // Body Type
  const damBody = damApp.bodyType ?? 'petite';
  const sireBody = sireApp.bodyType ?? damBody;
  [val, currentRng] = nextRng(currentRng);
  const bodyType = val < 0.5 ? damBody : sireBody;

  // Eye Color
  const damEye = damApp.eyeColor ?? 'amber';
  const sireEye = sireApp.eyeColor ?? damEye;
  [val, currentRng] = nextRng(currentRng);
  const eyeColor = val < 0.5 ? damEye : sireEye;

  // Secondary Color
  const secondaryColor = val < 0.5 ? damApp.secondaryColor : sireApp.secondaryColor;

  return [
    {
      breed,
      primaryColor,
      secondaryColor,
      pattern,
      eyeColor,
      bodyType,
      // Backward compatibility aliases
      coatColor: primaryColor,
      coatPattern: String(pattern),
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
