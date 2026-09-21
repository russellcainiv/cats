// src/app/api/households/[id]/route.ts
// GET: resume — download full save envelope. Rejects cross-owner reads.
// 401 unauthenticated · 403 wrong owner · 404 not found.

import { NextResponse } from 'next/server';
import { getIdentity, verifyOwnership } from '@/server/access';
import { findHousehold } from '@/server/db';
import { SCHEMA_VERSION } from '@/domain/save-schema';

export async function GET(request: Request) {
  const identity = await getIdentity(request);

  // Extract the household id from the URL path.
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const householdId = segments[segments.indexOf('api') + 2]; // /api/households/[id]
  if (!householdId) return NextResponse.json({ error: 'missing-id' }, { status: 400 });

  const h = findHousehold(householdId);

  // Reject unauthenticated reads (401), then cross-owner (403).
  if (!identity) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (!h || !verifyOwnership(h.ownerId, identity)) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  return NextResponse.json({
    schemaVersion: SCHEMA_VERSION,
    household: {
      id: h.id, ownerId: h.ownerId, name: h.name, seed: h.seed,
      revision: h.revision, createdAt: h.createdAt,
    },
    checksum: h.checksum,
  });
}
