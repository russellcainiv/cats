// src/app/api/households/[id]/takeover/route.ts
// POST: take over the lease for this household (increment lease epoch).
//   401 unauthenticated · 403 wrong owner · 404 not found.
// Task 04: sync-and-pause.
import { NextResponse } from 'next/server';
import { getIdentity, verifyOwnership } from '@/server/access';
import { findHousehold, upsertHousehold } from '@/server/db';

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

  const newLeaseEpoch = (h.leaseEpoch ?? 0) + 1;
  upsertHousehold({ ...h, leaseEpoch: newLeaseEpoch });

  return NextResponse.json({
    leaseEpoch: newLeaseEpoch,
    revision: h.revision,
    checksum: h.checksum,
  });
}
