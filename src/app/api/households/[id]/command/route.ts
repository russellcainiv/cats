// src/app/api/households/[id]/command/route.ts
// POST: dispatch a domain command (e.g. move-cat) and persist the result.
// 401 unauthenticated · 403 wrong owner · 400 invalid command · 422 invariant violation.
import { NextResponse } from 'next/server';
import { getIdentity, verifyOwnership } from '@/server/access';
import { findHousehold, upsertHousehold } from '@/server/db';
import { computeChecksum, SCHEMA_VERSION } from '@/domain/save-schema';
import { dispatch } from '@/domain/commands';
import type { WorldState } from '@/domain/state';
import type { GameCommand } from '@/domain/commands';

export async function POST(request: Request) {
  const identity = await getIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const householdId = segments[segments.indexOf('households') + 1];
  if (!householdId) return NextResponse.json({ error: 'missing-id' }, { status: 400 });

  const h = findHousehold(householdId);
  if (!h) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }
  if (!verifyOwnership(h.ownerId, identity)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const command = body as GameCommand;

  // Reconstruct full WorldState from stored envelope.
  const state: WorldState = {
    household: { id: h.id, ownerId: h.ownerId, name: h.name, seed: h.seed, revision: h.revision, createdAt: h.createdAt, launched: h.launched ?? false, leaseEpoch: h.leaseEpoch ?? 0 },
    cats: h.cats ?? {},
    home: h.home ?? { lotId: 'home', width: 8, height: 6, blockedCells: [] },
    simMinute: h.simMinute ?? 0,
    paused: h.paused ?? false,
  };

  const result = dispatch(state, command, { actorId: identity.ownerId, commandId: body.idempotencyKey ?? `cmd-${Date.now()}` });

  if (!result.ok) {
    return NextResponse.json({ error: result.error.code, message: result.error.message }, { status: 422 });
  }

  // Persist the new state.
  const newState = result.state;
  const saved = upsertHousehold({
    id: newState.household.id,
    ownerId: newState.household.ownerId,
    name: newState.household.name,
    seed: newState.household.seed,
    revision: newState.household.revision,
    createdAt: newState.household.createdAt,
    launched: newState.household.launched,
    leaseEpoch: newState.household.leaseEpoch,
    paused: newState.paused,
    cats: newState.cats,
    home: newState.home,
    simMinute: newState.simMinute,
    checksum: '',
  });

  // Recompute and persist checksum.
  const envelope = {
    schemaVersion: SCHEMA_VERSION,
    household: { id: saved.id, ownerId: saved.ownerId, name: saved.name, seed: saved.seed, revision: saved.revision, createdAt: saved.createdAt, launched: saved.launched },
    cats: saved.cats,
    home: saved.home,
    simMinute: saved.simMinute,
    paused: saved.paused,
    checksum: '',
  };
  envelope.checksum = computeChecksum(envelope);
  saved.checksum = envelope.checksum;
  upsertHousehold(saved);

  return NextResponse.json({
    schemaVersion: SCHEMA_VERSION,
    householdId: saved.id,
    revision: saved.revision,
    checksum: saved.checksum,
    events: result.events,
  });
}
