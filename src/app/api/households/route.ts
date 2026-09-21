// src/app/api/households/route.ts
// POST: create a household (idempotent — doubling Create makes one).
// GET: list the caller's households.
// Server checks owner identity; client never supplies ownerId.

import { NextResponse } from 'next/server';
import { getIdentity } from '@/server/access';
import { listHouseholds, upsertHousehold } from '@/server/db';
import { computeChecksum, SCHEMA_VERSION } from '@/domain/save-schema';
import { dispatch } from '@/domain/commands';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const identity = await getIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = (body.name || 'My cats').slice(0, 64);

  // Idempotency: if this owner already has a household, return it.
  // (Double-tapping Create makes one household per acceptance criterion.)
  const existing = listHouseholds(identity.ownerId);
  if (existing.length > 0) {
    const h = existing[0]!;
    const envelope = {
      schemaVersion: SCHEMA_VERSION,
      householdId: h.id,
      household: {
        id: h.id, ownerId: h.ownerId, name: h.name, seed: h.seed,
        revision: h.revision, createdAt: h.createdAt,
      },
      checksum: h.checksum,
    };
    return NextResponse.json(envelope, { status: 200 });
  }

  // Dispatch through the real domain command boundary.
  const commandId = uuidv4();
  const emptyState = {
    household: { id: '', ownerId: '', name: '', seed: '', revision: 0, createdAt: 0 },
  };
  const result = dispatch(emptyState, { type: 'create-household', payload: { name } }, {
    actorId: identity.ownerId,
    commandId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error.code, message: result.error.message }, { status: 400 });
  }

  const h = result.state.household;
  const envelopeData = { schemaVersion: SCHEMA_VERSION, household: {
    id: h.id, ownerId: h.ownerId, name: h.name, seed: h.seed,
    revision: 1, createdAt: h.createdAt,
  }, checksum: '' };
  const checksum = computeChecksum({ ...envelopeData, checksum: '' });
  const saved = upsertHousehold({
    id: h.id, ownerId: h.ownerId, name: h.name, seed: h.seed,
    revision: 1, checksum, createdAt: h.createdAt,
  });

  return NextResponse.json(
    {
      schemaVersion: SCHEMA_VERSION,
      householdId: saved.id,
      household: {
        id: saved.id, ownerId: saved.ownerId, name: saved.name, seed: saved.seed,
        revision: saved.revision, createdAt: saved.createdAt,
      },
      checksum: saved.checksum,
    },
    { status: 201 }
  );
}

export async function GET(request: Request) {
  const identity = await getIdentity(request);
  if (!identity) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const households = listHouseholds(identity.ownerId);
  return NextResponse.json({
    households: households.map(h => ({ id: h.id, name: h.name, seed: h.seed, revision: h.revision, createdAt: h.createdAt })),
  });
}
