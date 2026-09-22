// src/app/api/dev/issue-session/route.ts
// Test-only: issues a dev HMAC token for a synthetic owner.
// Production builds do NOT register this handler (guarded by NODE_ENV check).

import { NextResponse } from 'next/server';
import { issueDevToken } from '@/server/access';

export async function POST(request: Request) {
  // Only available in development/test. Production never exposes this.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not available' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const ownerId = body.ownerId || 'dev-owner-' + Math.random().toString(36).slice(2, 10);
  const householdId = body.householdId ?? null;
  const token = await issueDevToken(ownerId, householdId);

  return NextResponse.json({ token, ownerId, householdId });
}
