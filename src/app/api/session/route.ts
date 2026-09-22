// src/app/api/session/route.ts
// Read the current authenticated identity. Server-side only; never trusts client.
import { NextResponse } from 'next/server';
import { getIdentity } from '@/server/access';
import { listHouseholds } from '@/server/db';

export async function GET(request: Request) {
  const identity = await getIdentity(request);
  if (!identity) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const households = listHouseholds(identity.ownerId);
  const household = households.length > 0 ? households[0] : null;

  return NextResponse.json({
    authenticated: true,
    ownerId: identity.ownerId,
    householdId: household?.id ?? null,
    launched: household?.launched ?? false,
  });
}
