// tests/e2e/sync-and-pause.spec.ts
// CATS-4: Resume safely across devices and pause while away (R09, R10).
import { test, expect } from '@playwright/test';
import { openScenario, readCommittedView, DEV_BASE } from '../support/scenario';

test.describe('CATS-4: sync and pause', () => {
  test('second device fences stale saves via lease takeover', async ({ page, browser }) => {
    const { householdId, token } = await openScenario(page, 'sync-and-pause-e2e', { autoCreateAndLaunch: true });

    // World canvas is visible.
    await expect(page.locator('[data-testid="move-cat"]')).toBeVisible({ timeout: 10000 });

    // Pause triggers a save request to /save.
    await Promise.all([
      page.waitForRequest(r => r.url().endsWith('/save') && r.method() === 'POST'),
      page.getByRole('button', { name: 'Pause', exact: true }).click(),
    ]);
    await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 10000 });

    const before = await readCommittedView(page, householdId);
    const beforeRevision = before.revision;

    // Second device with the same cookies (same session).
    const secondContext = await browser.newContext({ storageState: await page.context().storageState() });
    const second = await secondContext.newPage();
    await second.goto(page.url());
    await expect(second.locator('[data-testid="move-cat"]')).toBeVisible({ timeout: 10000 });

    // Take over the lease.
    await second.getByRole('button', { name: 'Continue here', exact: true }).click();
    await expect(second.locator('[data-testid="save-status"]')).toHaveText('Saved');

    // simMinute unchanged after takeover (no writes from device 2).
    expect((await readCommittedView(second, householdId)).view.simMinute).toBe(before.view.simMinute);

    // Stale device (device 1) tries to save with old lease — should get 409.
    // Re-fetch the full envelope from the resume endpoint to build a stale save.
    const currentSave = await page.request.get(`${DEV_BASE}/api/households/${householdId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const currentBody = await currentSave.json();
    const stale = await page.request.post(`${DEV_BASE}/api/households/${householdId}/save`, {
      data: JSON.stringify({ ...currentBody, requestId: `req-${Date.now()}-${Math.random()}`, expectedRevision: beforeRevision, leaseEpoch: 0 }),
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
    });
    expect(stale.status()).toBe(409);

    // Checksum unchanged after the rejected stale write.
    expect((await readCommittedView(second, householdId)).checksum).toBe(before.checksum);

    await secondContext.close();
  });

  test('auto-save persists while running and pauses on hidden tab', async ({ page }) => {
    const { householdId } = await openScenario(page, 'sync-pause-hidden', { autoCreateAndLaunch: true });
    await expect(page.locator('[data-testid="move-cat"]')).toBeVisible({ timeout: 10000 });

    // Wait for the first auto-save tick.
    await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 15000 });

    const before = await readCommittedView(page, householdId);
    const beforeRevision = before.revision;

    // Hide the tab — should auto-pause via visibilitychange handler.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait for the visibility-triggered save to complete.
    await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 10000 });

    const afterHidden = await readCommittedView(page, householdId);
    expect(afterHidden.view.paused).toBe(true);
    // Only the visibility-triggered save should have happened (revision +1).
    expect(afterHidden.revision).toBe(beforeRevision + 1);
  });
});
