// src/server/access.ts
// Verified identity and private membership checks for every route.
// Production: swaps in Clerk. Dev: HMAC-signed token identity.
// NEVER accepts an ownerId from the client — always derives it server-side.

import crypto from 'node:crypto';

export type SessionIdentity = {
  ownerId: string;
  householdId: string | null;
};

const DEV_SECRET = process.env.DEV_AUTH_SECRET || 'dev-only-secret-change-in-prod-32+chars!';

function signToken(payload: { ownerId: string; householdId: string | null }): string {
  const body = Buffer.from(JSON.stringify(payload));
  const sig = crypto
    .createHmac('sha256', DEV_SECRET)
    .update(body)
    .digest('base64url');
  return body.toString('base64url') + '.' + sig;
}

function verifyToken(token: string): SessionIdentity | null {
  const [bodyB64, sig] = token.split('.');
  if (!bodyB64 || !sig) return null;
  const expected = crypto
    .createHmac('sha256', DEV_SECRET)
    .update(Buffer.from(bodyB64, 'base64url'))
    .digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString());
    return { ownerId: payload.ownerId, householdId: payload.householdId ?? null };
  } catch {
    return null;
  }
}

/**
 * Reads identity from the Authorization Bearer header or 'cats-session' cookie.
 * Production: parses Clerk session token here instead.
 */
export async function getIdentity(request: Request): Promise<SessionIdentity | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return verifyToken(authHeader.slice(7));
  }
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|; )cats-session=([^;]+)/);
    if (match) return verifyToken(decodeURIComponent(match[1]));
  }
  return null;
}

/** Issue a dev session token (test harness only). Production uses Clerk. */
export async function issueDevToken(
  ownerId: string,
  householdId: string | null
): Promise<string> {
  return signToken({ ownerId, householdId });
}

/** Check that the authenticated owner matches the household owner. */
export function verifyOwnership(
  householdOwnerId: string,
  identity: SessionIdentity | null
): boolean {
  return identity !== null && identity.ownerId === householdOwnerId;
}
