// src/app/api/households/[id]/save/route.ts
// POST: persist full game state with CAS, lease-epoch, and idempotency.
//   401 unauthenticated · 403 wrong owner · 404 not found
//   409 conflict (CAS revision mismatch OR stale lease epoch)
//   400 invalid (bad checksum or schema)
// Task 04: sync-and-pause.
import { NextResponse } from 'next/server';
import { getIdentity, verifyOwnership } from '@/server/access';
import { findHousehold, upsertHousehold, findProcessedRequest, recordProcessedRequest } from '@/server/db';
import { computeChecksum, validateEnvelope, SCHEMA_VERSION } from '@/domain/save-schema';
import type { SaveEnvelope } from '@/domain/save-schema';

type SaveRequest = SaveEnvelope & {
  requestId: string;
  expectedRevision: number;
  leaseEpoch: number;
};

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
  if (!h) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  if (!verifyOwnership(h.ownerId, identity)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const req = body as SaveRequest;

  // 1. Idempotency: if we already processed this requestId, replay the result.
  const existing = findProcessedRequest(householdId, req.requestId);
  if (existing) {
    return NextResponse.json({
      revision: existing.revision,
      checksum: existing.checksum,
      idempotent: true,
    });
  }

  // 2. CAS: expectedRevision must match the stored revision.
  if (req.expectedRevision !== h.revision) {
    return NextResponse.json({
      error: 'conflict',
      message: `Revision mismatch: expected ${req.expectedRevision}, got ${h.revision}`,
      currentRevision: h.revision,
      currentLeaseEpoch: h.leaseEpoch,
    }, { status: 409 });
  }

  // 3. Lease: leaseEpoch must match the stored lease epoch.
  if (req.leaseEpoch !== (h.leaseEpoch ?? 0)) {
    return NextResponse.json({
      error: 'lease-expired',
      message: 'Lease has been taken over by another device',
      currentLeaseEpoch: h.leaseEpoch,
    }, { status: 409 });
  }

  // 4. Validate checksum — extract just the SaveEnvelope fields so extra
  //    request metadata (requestId, expectedRevision, leaseEpoch) does not
  //    pollute the hash.
  const envelopeForValidation: SaveEnvelope = {
    schemaVersion: req.schemaVersion,
    household: {
      id: req.household.id,
      ownerId: req.household.ownerId,
      name: req.household.name,
      seed: req.household.seed,
      revision: req.household.revision,
      createdAt: req.household.createdAt,
      launched: req.household.launched,
    },
    cats: req.cats,
    home: req.home,
    simMinute: req.simMinute,
    paused: req.paused,
    checksum: req.checksum,
  };
  if (!validateEnvelope(envelopeForValidation)) {
    return NextResponse.json({ error: 'invalid-checksum' }, { status: 400 });
  }

  // 5. Persist the new state and increment revision.
  const newRevision = h.revision + 1;
  const saved = upsertHousehold({
    id: h.id,
    ownerId: h.ownerId,
    name: req.household.name,
    seed: req.household.seed,
    revision: newRevision,
    createdAt: req.household.createdAt,
    launched: req.household.launched,
    leaseEpoch: h.leaseEpoch ?? 0,
    paused: req.paused ?? false,
    cats: req.cats ?? h.cats,
    home: req.home ?? h.home,
    simMinute: req.simMinute ?? h.simMinute,
    checksum: '',
  });

  // 6. Recompute checksum with the new revision (NOT leaseEpoch — that's server-managed).
  const envelopeForChecksum: SaveEnvelope = {
    schemaVersion: SCHEMA_VERSION,
    household: {
      id: saved.id,
      ownerId: saved.ownerId,
      name: saved.name,
      seed: saved.seed,
      revision: saved.revision,
      createdAt: saved.createdAt,
      launched: saved.launched,
    },
    cats: saved.cats,
    home: saved.home,
    simMinute: saved.simMinute,
    paused: saved.paused,
    checksum: '',
  };
  envelopeForChecksum.checksum = computeChecksum(envelopeForChecksum);
  saved.checksum = envelopeForChecksum.checksum;
  upsertHousehold(saved);

  // 7. Record idempotency key.
  recordProcessedRequest(householdId, req.requestId, {
    revision: newRevision,
    checksum: envelopeForChecksum.checksum,
  });

  return NextResponse.json({
    revision: newRevision,
    checksum: envelopeForChecksum.checksum,
    idempotent: false,
  });
}
