// src/server/db.ts
// Real development adapter for household persistence.
// Swaps in Neon Postgres for production; the interface is identical.
// Now stores full WorldState (cats, home, simMinute), not just household metadata.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { WorldState } from '@/domain/state';

const DB_DIR = join(process.cwd(), '.scratch', 'runtime', 'db');
const DB_FILE = join(DB_DIR, 'dev-households.json');

type StoredHousehold = {
  id: string;
  ownerId: string;
  name: string;
  seed: string;
  revision: number;
  checksum: string;
  createdAt: number;
  launched: boolean;
  // v2 additions (may be absent on v1 households — caller migrates)
  cats?: WorldState['cats'];
  home?: WorldState['home'];
  simMinute?: number;
};

type DBState = {
  households: StoredHousehold[];
};

function ensureDb(): DBState {
  mkdirSync(DB_DIR, { recursive: true });
  if (!existsSync(DB_FILE)) {
    const empty: DBState = { households: [] };
    writeFileSync(DB_FILE, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
  try {
    const raw = readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.households)) return parsed;
  } catch {
    const quarantine = DB_FILE + '.corrupt-' + Date.now();
    try {
      writeFileSync(quarantine, readFileSync(DB_FILE, 'utf-8'), 'utf-8');
    } catch {}
  }
  const empty: DBState = { households: [] };
  writeFileSync(DB_FILE, JSON.stringify(empty, null, 2), 'utf-8');
  return empty;
}

export function listHouseholds(ownerId: string): StoredHousehold[] {
  const db = ensureDb();
  return db.households.filter(h => h.ownerId === ownerId);
}

export function findHousehold(id: string): StoredHousehold | null {
  const db = ensureDb();
  return db.households.find(h => h.id === id) ?? null;
}

export function upsertHousehold(h: StoredHousehold): StoredHousehold {
  const db = ensureDb();
  const idx = db.households.findIndex(existing => existing.id === h.id);
  if (idx >= 0) db.households[idx] = h;
  else db.households.push(h);
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  // Return a fresh copy to prevent mutation of the cached reference.
  return { ...h };
}

export type { StoredHousehold };
