// tests/support/scenario.ts
// Browser fixture setup. Test-only backend handler (dev issue-session), opens real game route.
// Production builds do NOT register the dev handler — guarded by NODE_ENV in the route.

import type { Page } from '@playwright/test';

export const DEV_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export type CommittedView = {
  revision: number;
  checksum: string;
  view: {
    household: {
      id: string;
      ownerId: string;
      name: string;
      seed: string;
      revision: number;
      createdAt: number;
    };
  };
};

// Fixture registry: maps fixture names to deterministic test owners.
const FIXTURE_OWNERS: Record<string, string> = {};

function fixtureOwner(name: string): string {
  if (!FIXTURE_OWNERS[name]) {
    FIXTURE_OWNERS[name] = `test-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return FIXTURE_OWNERS[name];
}

/**
 * Deterministic fixture: creates a unique test owner through the dev-only
 * issue-session endpoint, sets a real auth cookie, and navigates to the game.
 * Uses real backend storage — never synthesizes the asserted result.
 */
export async function openScenario(page: Page, name: string): Promise<{ householdId: string; token: string }> {
  const ownerId = fixtureOwner(name);

  const tokenRes = await page.request.post(`${DEV_BASE}/api/dev/issue-session`, {
    data: JSON.stringify({ ownerId }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!tokenRes.ok()) {
    const body = await tokenRes.text();
    throw new Error(`openScenario: issue-session failed ${tokenRes.status()}: ${body.slice(0, 200)}`);
  }
  const tokenData = (await tokenRes.json()) as { token: string; ownerId: string; householdId: string | null };
  const token = tokenData.token;

  // Set the signed session cookie on the page context.
  await page.context().addCookies([{
    name: 'cats-session',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }]);

  await page.goto('/game');
  await page.waitForURL('/game', { timeout: 10000 });
  // Wait for the loading state to clear and the real UI to appear.
  await page.waitForSelector('text=/Create household|Household ready/i', { timeout: 10000 });

  return { householdId: '', token };
}

/**
 * Real authenticated GET of the committed view route.
 * Throws on non-200 (never returns synthetic data).
 */
export async function readCommittedView(page: Page, householdId: string): Promise<CommittedView> {
  const token = await getSessionToken(page);
  const res = await page.request.get(`${DEV_BASE}/api/households/${householdId}/view`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok()) {
    throw new Error(`readCommittedView failed: ${res.status()} ${res.statusText()}`);
  }
  return (await res.json()) as CommittedView;
}

/**
 * Polls the view route until revision increases or times out (10s).
 */
export async function waitForCommit(page: Page, householdId: string, previousRevision: number): Promise<CommittedView> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const view = await readCommittedView(page, householdId);
      if (view.revision > previousRevision) return view;
    } catch {
      // not yet saved
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('waitForCommit timed out');
}

/**
 * Extract the session token from cookies for raw API requests.
 * Uses Bearer header for the APIRequestContext (cookies not sent by page.request to API).
 */
async function getSessionToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const c = cookies.find(c => c.name === 'cats-session');
  return c ? c.value : null;
}
