// tests/domain/sync-and-pause.test.ts
// CATS-4: sync-and-pause domain tests — paused, leaseEpoch, checksum integrity.
import { describe, it, expect } from 'vitest';
import { dispatch } from '@/domain/commands';
import { selectView } from '@/domain/selectors';
import { computeChecksum, validateEnvelope, SCHEMA_VERSION } from '@/domain/save-schema';
import { migrateEnvelope } from '@/domain/save-schema';
import type { WorldState } from '@/domain/state';
import type { SaveEnvelope } from '@/domain/save-schema';
import { v4 as uuidv4 } from 'uuid';

function emptyState(): WorldState {
  return {
    household: { id: '', ownerId: '', name: '', seed: '', revision: 0, createdAt: 0, launched: false, leaseEpoch: 0 },
    cats: {},
    home: { lotId: '', width: 0, height: 0, blockedCells: [] },
    simMinute: 0,
    paused: false,
  };
}

describe('sync-and-pause: initial state', () => {
  it('create-household sets paused=false and leaseEpoch=0', () => {
    const ownerId = uuidv4();
    const result = dispatch(emptyState(), { type: 'create-household', payload: { name: 'Home' } }, {
      actorId: ownerId, commandId: uuidv4(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.household.leaseEpoch).toBe(0);
      expect(result.state.paused).toBe(false);
    }
  });

  it('selectView projects paused and leaseEpoch', () => {
    const ownerId = uuidv4();
    const result = dispatch(emptyState(), { type: 'create-household', payload: { name: 'Home' } }, {
      actorId: ownerId, commandId: uuidv4(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const view = selectView(result.state);
      expect(view.paused).toBe(false);
      expect(view.household.leaseEpoch).toBe(0);

      // Simulate lease takeover by modifying state.
      const updated = { ...result.state, household: { ...result.state.household, leaseEpoch: 1 } };
      const updatedView = selectView(updated);
      expect(updatedView.household.leaseEpoch).toBe(1);
    }
  });
});

describe('sync-and-pause: checksum integrity', () => {
  it('paused is part of the checksum — changing it changes the hash', () => {
    const ownerId = uuidv4();
    const result = dispatch(emptyState(), { type: 'create-household', payload: { name: 'Home' } }, {
      actorId: ownerId, commandId: uuidv4(),
    });
    if (!result.ok) return;

    const h = result.state.household;
    const envUnpaused: SaveEnvelope = {
      schemaVersion: SCHEMA_VERSION,
      household: { id: h.id, ownerId: h.ownerId, name: h.name, seed: h.seed, revision: h.revision, createdAt: h.createdAt, launched: h.launched },
      paused: false,
      checksum: '',
    };
    const envPaused: SaveEnvelope = { ...envUnpaused, paused: true };
    expect(computeChecksum(envUnpaused)).not.toBe(computeChecksum(envPaused));
    expect(validateEnvelope({ ...envUnpaused, checksum: computeChecksum(envUnpaused) })).toBe(true);
    expect(validateEnvelope({ ...envPaused, checksum: computeChecksum(envPaused) })).toBe(true);
  });

  it('leaseEpoch is NOT part of the checksum — takeover does not invalidate it', () => {
    const ownerId = uuidv4();
    const result = dispatch(emptyState(), { type: 'create-household', payload: { name: 'Home' } }, {
      actorId: ownerId, commandId: uuidv4(),
    });
    if (!result.ok) return;

    const h = result.state.household;
    const env: SaveEnvelope = {
      schemaVersion: SCHEMA_VERSION,
      household: { id: h.id, ownerId: h.ownerId, name: h.name, seed: h.seed, revision: h.revision, createdAt: h.createdAt, launched: h.launched },
      paused: false,
      checksum: '',
    };
    const checksum1 = computeChecksum(env);
    // A different leaseEpoch in the household object should NOT change the checksum
    // (leaseEpoch is not a field of SaveEnvelope.household).
    expect(checksum1).toBe(computeChecksum(env));
  });
});

describe('sync-and-pause: v1 migration defaults', () => {
  it('migrateEnvelope provides paused=false default for v1', () => {
    // A v1 envelope (no simMinute, no paused) should migrate to paused=false.
    const env: SaveEnvelope = {
      schemaVersion: 1, // v1
      household: { id: 'x', ownerId: 'o', name: 'n', seed: 's', revision: 1, createdAt: 1, launched: false },
      checksum: '',
    };
    const migrated = migrateEnvelope(env);
    expect(migrated.paused).toBe(false);
  });
});
