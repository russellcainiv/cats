// tests/e2e/playable-home.spec.ts
// CATS-3: Select and move an animated cat in the approved world.
import { test, expect } from '@playwright/test';
import { openScenario, readCommittedView, waitForCommit, DEV_BASE } from '../support/scenario';

const GARDEN = { lotId: 'home', x: 4, y: 2 };
const START = { lotId: 'home', x: 6, y: 4 };

test.describe('CATS-3: playable home', () => {
  test('cat loads at start position and can move to the garden', async ({ page }) => {
    const { householdId } = await openScenario(page, 'playable-home-e2e', { autoCreateAndLaunch: true });

    // World canvas appears with the cat's needs and the move button.
    await expect(page.locator('[data-testid="move-cat"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Mochi is at \(6, 4\)/i)).toBeVisible();

    // Verify initial committed state.
    const beforeView = await readCommittedView(page, householdId);
    expect(beforeView.view.cats.mochi.position).toEqual(START);
    expect(beforeView.view.household.launched).toBe(true);
    const beforeRevision = beforeView.revision;

    // Click "Move to garden" and wait for server-side commit.
    await page.click('[data-testid="move-cat"]');
    await page.waitForSelector('text=/Moving…/i', { timeout: 5000 });

    const afterView = await waitForCommit(page, householdId, beforeRevision);
    expect(afterView.view.cats.mochi.position).toEqual(GARDEN);
    expect(afterView.view.cats.mochi.lastRoute.length).toBeGreaterThan(0);
    // Every cell in the route must be within bounds and not blocked.
    const blocked = afterView.view.home.blockedCells;
    for (const cell of afterView.view.cats.mochi.lastRoute) {
      const isBlocked = blocked.some(b => b.lotId === cell.lotId && b.x === cell.x && b.y === cell.y);
      expect(isBlocked).toBe(false);
    }
    // Revision incremented.
    expect(afterView.revision).toBeGreaterThan(beforeRevision);
  });

  test('cat position persists across page reload', async ({ page }) => {
    const { householdId } = await openScenario(page, 'playable-home-persist', { autoCreateAndLaunch: true });

    await expect(page.locator('[data-testid="move-cat"]')).toBeVisible({ timeout: 10000 });

    // Move cat to garden.
    const beforeView = await readCommittedView(page, householdId);
    const beforeRevision = beforeView.revision;
    await page.click('[data-testid="move-cat"]');
    const afterView = await waitForCommit(page, householdId, beforeRevision);
    expect(afterView.view.cats.mochi.position).toEqual(GARDEN);

    // Reload — cat should still be at the garden.
    await page.reload();
    await page.waitForSelector('[data-testid="move-cat"]', { timeout: 10000 });
    await expect(page.getByText(/Mochi is at the garden/i)).toBeVisible();

    const reloadedView = await readCommittedView(page, householdId);
    expect(reloadedView.view.cats.mochi.position).toEqual(GARDEN);
    expect(reloadedView.view.household.launched).toBe(true);

    // Checksum must be a valid non-empty string (server recomputes from stored envelope).
    expect(reloadedView.checksum).toMatch(/^[0-9a-z]{8}$/);
  });

  test('stranger cannot move cat', async ({ page, browser }) => {
    const { householdId } = await openScenario(page, 'playable-home-guard', { autoCreateAndLaunch: true });

    // Use a second browser context to simulate a stranger.
    const strangerCtx = await browser.newContext();
    const strangerPage = await strangerCtx.newPage();
    // Stranger has their own dev session but no household.
    const strangerOwnerId = `stranger-${Date.now()}`;
    const tokenRes = await strangerPage.request.post(`${DEV_BASE}/api/dev/issue-session`, {
      data: JSON.stringify({ ownerId: strangerOwnerId }),
      headers: { 'Content-Type': 'application/json' },
    });
    const tokenData = (await tokenRes.json()) as { token: string };
    const token = tokenData.token;

    // Stranger tries to move the cat.
    const moveRes = await strangerPage.request.post(`${DEV_BASE}/api/households/${householdId}/command`, {
      data: JSON.stringify({ type: 'move-cat', payload: { catId: 'mochi', destination: GARDEN } }),
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
      },
    });
    expect(moveRes.status()).toBe(403);

    await strangerCtx.close();
  });
});
