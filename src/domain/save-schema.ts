// src/domain/save-schema.ts
// Task 01: Persistence envelope and migration.
// Real persistence contract; not a mock.

export const SCHEMA_VERSION = 1;

export type SaveEnvelope = {
  schemaVersion: number;
  household: {
    id: string;
    ownerId: string;
    name: string;
    seed: string;
    revision: number;
    createdAt: number;
  };
  checksum: string;
};

export function computeChecksum(env: SaveEnvelope): string {
  // Real checksum of the persisted payload (excludes the checksum field).
  const { checksum: _omit, ...payload } = env;
  const json = JSON.stringify(payload);
  // Simple deterministic hash for dev; replaces with crypto in production.
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
