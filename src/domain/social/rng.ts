// src/domain/social/rng.ts
// Deterministic Seeded PRNG for Social Subsystem.

import { RngStateData } from './types';

/**
 * Mulberry32 PRNG. Produces deterministic floats in [0, 1).
 */
export function nextRandomFloat(rng: RngStateData): { value: number; nextRng: RngStateData } {
  const counter = rng.counter + 1;
  let t = (rng.seed + counter * 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const raw = ((t ^ (t >>> 14)) >>> 0) / 4294967296;

  return {
    value: raw,
    nextRng: {
      seed: rng.seed,
      counter
    }
  };
}
