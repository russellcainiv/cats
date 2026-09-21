// tests/e2e/private-household.spec.ts
import { test, expect } from '@playwright/test';
import { openScenario, readCommittedView, DEV_BASE } from '../support/scenario';

test.describe('private-household', () => {
  // Warm up all routes before tests to avoid Turbopack concurrent-compile race.
  test.beforeAll(async ({ request }) => {
    await request.get(`${DEV_BASE}/api/health`);
    await request.post(`${DEV_BASE}/api/dev/issue-session`, {
      data: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));
  });

  test('create persists once and denies strangers', async ({ page, browser }) => {
    // Stranger: a brand-new browser context with no cookies.
    const strangerCtx = await browser.newContext();
    const stranger = await strangerCtx.newPage();

    await openScenario(page, 'persist-strangers');

    // Fill in a household name and Create.
    await page.getByLabel('Household name').fill('Grandma’s crib');
    await page.getByRole('button', { name: /Create household/i }).click();

    // HouseholdShell should appear — proving the Create POST succeeded.
    await page.waitForSelector('text=/Household ready/i', { timeout: 10000 });

    // Extract the persisted household id from the page.
    const householdId = (await page.textContent('[data-testid="household-id"]') || '').replace('ID: ', '').trim();
    expect(householdId).toBeTruthy();

    // Verify committed view via the dedicated view route (real server persistence).
    const view = await readCommittedView(page, householdId);
    expect(view.revision).toBe(1);
    expect(view.view.household.name).toBe('Grandma’s crib');

    // Hard reload — the auth cookie must resume the existing household.
    await page.reload();
    await page.waitForSelector('text=/Household ready/i', { timeout: 10000 });
    const resumedId = (await page.textContent('[data-testid="household-id"]') || '').replace('ID: ', '').trim();
    expect(resumedId).toBe(householdId);

    // Stranger with a DIFFERENT auth token must NOT read this household.
    const strangerTokenRes = await stranger.request.post(`${DEV_BASE}/api/dev/issue-session`, {
      data: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const strangerToken = (await strangerTokenRes.json()).token as string;
    const viewRes = await stranger.request.get(`${DEV_BASE}/api/households/${householdId}/view`, {
      headers: { authorization: `Bearer ${strangerToken}` },
    });
    expect(viewRes.status()).toBe(403);

    await strangerCtx.close();
  });

  test('double-tapping Create makes one household', async ({ page }) => {
    const ownerId = `test-doubletap-${Date.now()}`;

    // Issue a dev session token for a fresh owner.
    const issueTokenRes = await page.request.post(`${DEV_BASE}/api/dev/issue-session`, {
      data: JSON.stringify({ ownerId }),
      headers: { 'Content-Type': 'application/json' },
    });
    const issueToken = (await issueTokenRes.json()).token as string;

    const body = JSON.stringify({ name: 'The nest', idempotencyKey: 'doubletap-key' });
    const headers = { authorization: `Bearer ${issueToken}`, 'Content-Type': 'application/json' };

    // First Create — should create a household (201).
    const first = await page.request.post(`${DEV_BASE}/api/households`, { headers, data: body });
    expect(first.status()).toBe(201);
    const firstJson = await first.json() as { householdId: string };

    // Second Create with same owner — must return the SAME household (idempotent).
    const second = await page.request.post(`${DEV_BASE}/api/households`, { headers, data: body });
    expect(second.status()).toBe(200);
    const secondJson = await second.json() as { householdId: string };
    expect(secondJson.householdId).toBe(firstJson.householdId);

    // Server-side: exactly one household for this owner.
    const listRes = await page.request.get(`${DEV_BASE}/api/households`, { headers });
    expect(listRes.status()).toBe(200);
    const list = (await listRes.json()) as { households: Array<{ id: string }> };
    expect(list.households).toHaveLength(1);
    expect(list.households[0].id).toBe(firstJson.householdId);
  });
});
