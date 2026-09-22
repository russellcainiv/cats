/**
 * Collection Dex Serialization & Deserialization
 *
 * Owned path: src/domain/collection/serializer.ts
 */

import { CollectionDexState } from './types';
import { createInitialDexState } from './engine';

export interface SerializedCollectionState {
  version: number;
  discoveries: Record<string, any>;
  encounters: Record<string, any>;
  lastScheduleCheckSimMinute: number;
  cooldownUntilSimMinute: number;
  checksum: string;
}

/**
 * Compute simple deterministic checksum string.
 */
export function computeCollectionChecksum(state: CollectionDexState): string {
  const payload = JSON.stringify({
    version: state.version,
    discoveriesKeys: Object.keys(state.discoveries).sort(),
    encountersKeys: Object.keys(state.encounters).sort(),
    lastCheck: state.lastScheduleCheckSimMinute,
  });

  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `chk_${Math.abs(hash).toString(16)}`;
}

export function serializeCollectionState(state: CollectionDexState): SerializedCollectionState {
  return {
    version: state.version,
    discoveries: state.discoveries,
    encounters: state.encounters,
    lastScheduleCheckSimMinute: state.lastScheduleCheckSimMinute,
    cooldownUntilSimMinute: state.cooldownUntilSimMinute,
    checksum: computeCollectionChecksum(state),
  };
}

export function deserializeCollectionState(data: unknown): CollectionDexState {
  if (!data || typeof data !== 'object') {
    return createInitialDexState();
  }

  const obj = data as Partial<SerializedCollectionState>;

  if (typeof obj.version !== 'number' || obj.version < 1) {
    return createInitialDexState();
  }

  return {
    version: obj.version,
    discoveries: obj.discoveries && typeof obj.discoveries === 'object' ? obj.discoveries : {},
    encounters: obj.encounters && typeof obj.encounters === 'object' ? obj.encounters : {},
    lastScheduleCheckSimMinute: typeof obj.lastScheduleCheckSimMinute === 'number' ? obj.lastScheduleCheckSimMinute : 0,
    cooldownUntilSimMinute: typeof obj.cooldownUntilSimMinute === 'number' ? obj.cooldownUntilSimMinute : 0,
  };
}
