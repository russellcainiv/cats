// src/domain/save-schema.ts
// Persistence envelope and migration. Task 01: v1 household only.
// Task 02: extended to v2 with cats, home, simMinute — migrates v1 forward.

import { WorldState } from './state';
import type { Cat, Home } from './state';

export const SCHEMA_VERSION = 2;

// The persisted envelope for a household. v2 adds cats/home/simMinute.
export type SaveEnvelope = {
  schemaVersion: number;
  household: {
    id: string;
    ownerId: string;
    name: string;
    seed: string;
    revision: number;
    createdAt: number;
    launched: boolean;
  };
  cats?: Record<string, Cat>;
  home?: Home;
  simMinute?: number;
  paused?: boolean;
  checksum: string;
};

// Migration: extract cats/home/simMinute from envelope, providing v2 defaults
// when loading a v1 household that predates these fields.
export function migrateEnvelope(env: SaveEnvelope): Pick<WorldState, 'cats' | 'home' | 'simMinute' | 'paused'> {
  if (env.schemaVersion < 2) {
    return {
      cats: defaultCats(env.household.seed),
      home: defaultHome(env.household.seed),
      simMinute: 0,
      paused: false,
    };
  }
  return {
    cats: env.cats ?? defaultCats(env.household.seed),
    home: env.home ?? defaultHome(env.household.seed),
    simMinute: env.simMinute ?? 0,
    paused: env.paused ?? false,
  };
}

export function defaultCats(seed: string): Record<string, Cat> {
  void seed;
  return {
    mochi: {
      id: 'mochi',
      name: 'Mochi',
      position: { lotId: 'home', x: 6, y: 4 },
      lastRoute: [],
      needs: { hunger: 80, energy: 80, fun: 50 },
      state: 'idle',
    },
  };
}

export function defaultHome(seed: string): Home {
  void seed;
  return {
    lotId: 'home',
    width: 8,
    height: 6,
    blockedCells: [{ lotId: 'home', x: 4, y: 3 }],
  };
}

export function computeChecksum(env: SaveEnvelope): string {
  const { checksum: _omit, ...payload } = env;
  const json = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const c = json.charCodeAt(i);
    hash = ((hash << 5) - hash + c) | 0;
  }
  return (hash >>> 0).toString(36).padStart(8, '0');
}

export function validateEnvelope(env: SaveEnvelope): boolean {
  if (env.schemaVersion !== SCHEMA_VERSION) return false;
  if (!env.household.id || !env.household.ownerId || !env.household.seed) return false;
  if (env.household.revision < 0) return false;
  return computeChecksum(env) === env.checksum;
}
