// src/app/api/households/[id]/route.ts
// GET: resume — download full save envelope. Rejects cross-owner reads.
// 401 unauthenticated · 403 wrong owner · 404 not found.
import { NextResponse } from 'next/server';
import { getIdentity, verifyOwnership } from '@/server/access';
import { findHousehold } from '@/server/db';
import { SCHEMA_VERSION, defaultCats, defaultHome } from '@/domain/save-schema';

export async function GET(request: Request) {
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

  return NextResponse.json({
    schemaVersion: SCHEMA_VERSION,
    household: { id: h.id, ownerId: h.ownerId, name: h.name, seed: h.seed, revision: h.revision, createdAt: h.createdAt, launched: h.launched },
    cats: h.cats ?? defaultCats(h.seed),
    home: h.home ?? defaultHome(h.seed),
    simMinute: h.simMinute ?? 0,
    checksum: h.checksum,
  });
}
