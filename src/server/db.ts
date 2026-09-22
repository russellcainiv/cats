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
  leaseEpoch: number;   // server-managed; NOT part of checksum
  paused: boolean;      // game state; IS part of checksum
  // v2 additions (may be absent on v1 households — caller migrates)
  cats?: WorldState['cats'];
  home?: WorldState['home'];
  simMinute?: number;
  // Idempotency log: requestId → result (prevents double-writes on retry).
  processedRequests?: Record<string, { revision: number; checksum: string }>;
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
  return { ...h };
}

// Idempotency: record and look up processed save requests. Prevents
// double-writes when a client retries after a lost response.
type ProcessedResult = { revision: number; checksum: string };

export function findProcessedRequest(householdId: string, requestId: string): ProcessedResult | null {
  const h = findHousehold(householdId);
  if (!h || !h.processedRequests) return null;
  return h.processedRequests[requestId] ?? null;
}

export function recordProcessedRequest(householdId: string, requestId: string, result: ProcessedResult): void {
  const h = findHousehold(householdId);
  if (!h) return;
  if (!h.processedRequests) h.processedRequests = {};
  h.processedRequests[requestId] = result;
  upsertHousehold(h);
}

export type { StoredHousehold };
