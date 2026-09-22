// src/app/api/households/route.ts
// POST: create a household (idempotent). GET: list caller's households.
import { NextResponse } from 'next/server';
import { getIdentity } from '@/server/access';
import { listHouseholds, upsertHousehold } from '@/server/db';
import { computeChecksum, SCHEMA_VERSION, defaultCats, defaultHome } from '@/domain/save-schema';
import { dispatch } from '@/domain/commands';
import type { WorldState } from '@/domain/state';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const identity = await getIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = (body.name || 'My cats').slice(0, 64);

  // Idempotency: if this owner already has a household, return it.
  const existing = listHouseholds(identity.ownerId);
  if (existing.length > 0) {
    const h = existing[0]!;
    return NextResponse.json({
      schemaVersion: SCHEMA_VERSION,
      householdId: h.id,
      household: { id: h.id, ownerId: h.ownerId, name: h.name, seed: h.seed, revision: h.revision, createdAt: h.createdAt, launched: h.launched },
      cats: h.cats ?? defaultCats(h.seed),
      home: h.home ?? defaultHome(h.seed),
      simMinute: h.simMinute ?? 0,
      checksum: h.checksum,
    }, { status: 200 });
  }

  // Dispatch through the real domain command boundary.
  const commandId = uuidv4();
  const emptyState: WorldState = {
    household: { id: '', ownerId: '', name: '', seed: '', revision: 0, createdAt: 0, launched: false },
    cats: {},
    home: { lotId: '', width: 0, height: 0, blockedCells: [] },
    simMinute: 0,
  };
  const result = dispatch(emptyState, { type: 'create-household', payload: { name } }, {
    actorId: identity.ownerId,
    commandId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error.code, message: result.error.message }, { status: 400 });
  }

  const h = result.state.household;
  const saved = upsertHousehold({
    id: h.id, ownerId: h.ownerId, name: h.name, seed: h.seed,
    revision: h.revision, createdAt: h.createdAt,
    launched: result.state.household.launched,
    cats: result.state.cats,
    home: result.state.home,
    simMinute: result.state.simMinute,
    checksum: '',
  });

  // Compute checksum
  const envelope = {
    schemaVersion: SCHEMA_VERSION,
    household: { id: saved.id, ownerId: saved.ownerId, name: saved.name, seed: saved.seed, revision: saved.revision, createdAt: saved.createdAt, launched: saved.launched },
    cats: saved.cats,
    home: saved.home,
    simMinute: saved.simMinute,
    checksum: '',
  };
  envelope.checksum = computeChecksum(envelope);
  // Re-save with checksum
  saved.checksum = envelope.checksum;
  upsertHousehold(saved);

  return NextResponse.json(
    {
      schemaVersion: SCHEMA_VERSION,
      householdId: saved.id,
      household: { id: saved.id, ownerId: saved.ownerId, name: saved.name, seed: saved.seed, revision: saved.revision, createdAt: saved.createdAt, launched: saved.launched },
      cats: saved.cats,
      home: saved.home,
      simMinute: saved.simMinute,
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
