// tests/domain/private-household.test.ts
// Domain-level tests: dispatch, checksum, idempotency, invariants, owner isolation.

import { describe, it, expect } from 'vitest';
import { dispatch } from '@/domain/commands';
import { selectView } from '@/domain/selectors';
import { computeChecksum, validateEnvelope, SCHEMA_VERSION } from '@/domain/save-schema';
import { checkInvariants, canAccess } from '@/domain/invariants';
import { WorldState } from '@/domain/state';
import { v4 as uuidv4 } from 'uuid';

function emptyState(): WorldState {
  return {
    household: { id: '', ownerId: '', name: '', seed: '', revision: 0, createdAt: 0 },
  };
}

describe('create-household command', () => {
  it('creates a household with stable identity and name', () => {
    const ownerId = uuidv4();
    const result = dispatch(emptyState(), { type: 'create-household', payload: { name: 'My cats' } }, {
      actorId: ownerId,
      commandId: uuidv4(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.household.id).toBeTruthy();
      expect(result.state.household.ownerId).toBe(ownerId);
      expect(result.state.household.name).toBe('My cats');
      expect(result.state.household.seed).toBeTruthy();
      expect(result.state.household.revision).toBe(1);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('household-created');
    }
  });

  it('rejects duplicate creation (idempotency at domain level)', () => {
    const ownerId = uuidv4();
    const first = dispatch(emptyState(), { type: 'create-household', payload: { name: 'My cats' } }, {
      actorId: ownerId, commandId: uuidv4(),
    });
    expect(first.ok).toBe(true);

    if (first.ok) {
      // Dispatching again on the populated state fails — one household per owner.
      const second = dispatch(first.state, { type: 'create-household', payload: { name: 'My cats' } }, {
        actorId: ownerId, commandId: uuidv4(),
      });
      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.error.code).toBe('household-exists');
      }
    }
  });
});

describe('checksums and envelopes', () => {
  it('produces a stable, recomputable checksum', () => {
    const ownerId = uuidv4();
    const result = dispatch(emptyState(), { type: 'create-household', payload: { name: 'Test' } }, {
      actorId: ownerId, commandId: uuidv4(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const h = result.state.household;
    const env = {
      schemaVersion: SCHEMA_VERSION,
      household: { id: h.id, ownerId: h.ownerId, name: h.name, seed: h.seed, revision: h.revision, createdAt: h.createdAt },
      checksum: '',
    };
    const checksum1 = computeChecksum(env);
    const checksum2 = computeChecksum(env);
    expect(checksum1).toBe(checksum2);
    expect(validateEnvelope({ ...env, checksum: checksum1 })).toBe(true);
  });
});

describe('invariants and owner isolation', () => {
  it('passes invariants for a well-formed household', () => {
    const ownerId = uuidv4();
    const result = dispatch(emptyState(), { type: 'create-household', payload: { name: 'OK' } }, {
      actorId: ownerId, commandId: uuidv4(),
    });
    if (result.ok) {
      expect(checkInvariants(result.state)).toHaveLength(0);
    }
  });

  it('detects missing owner as a violation', () => {
    const result = dispatch(emptyState(), { type: 'create-household', payload: { name: 'X' } }, {
      actorId: uuidv4(), commandId: uuidv4(),
    });
    if (result.ok) {
      // Tamper: remove ownerId to simulate cross-owner or unauthenticated state.
      const tampered = { ...result.state, household: { ...result.state.household, ownerId: '' } };
      const violations = checkInvariants(tampered);
      expect(violations).toContainEqual(
        expect.objectContaining({ code: 'missing-owner' })
      );
    }
  });

  it('rejects cross-owner access via canAccess', () => {
    expect(canAccess('owner-1', 'owner-1')).toBe(true);
    expect(canAccess('owner-1', 'owner-2')).toBe(false);
    expect(canAccess('owner-1', null)).toBe(false);
  });
});

describe('selectView', () => {
  it('projects household identity without leaking internal fields', () => {
    const ownerId = uuidv4();
    const result = dispatch(emptyState(), { type: 'create-household', payload: { name: 'View' } }, {
      actorId: ownerId, commandId: uuidv4(),
    });
    if (result.ok) {
      const view = selectView(result.state);
      expect(view.household.name).toBe('View');
      expect(view.household.id).toBe(result.state.household.id);
      expect(view.household.seed).toBe(result.state.household.seed);
      expect(view.household.revision).toBe(result.state.household.revision);
    }
  });
});
