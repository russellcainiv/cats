// tests/e2e/cat-creator.spec.ts
// CATS-5: Create real or imaginary cats (Task 04).
import { test, expect } from '@playwright/test';
import { openScenario, readCommittedView, waitForCommit, DEV_BASE } from '../support/scenario';

test.describe('CATS-5: cat creator', () => {
  test('cat creator appears on household shell and creates a cat', async ({ page }) => {
    const { householdId } = await openScenario(page, 'cat-creator-basic', { autoCreate: true });

    // HouseholdShell shows the cat creator.
    await expect(page.locator('text=/Create a New Cat/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="create-cat-btn"]')).toBeVisible();

    // Default cat (Mochi) exists from create-household.
    const beforeView = await readCommittedView(page, householdId);
    const beforeCount = Object.keys(beforeView.view.cats).length;
    expect(beforeCount).toBe(1);

    // Fill the new cat form.
    await page.fill('input[type="text"]', 'Luna');
    // Select "Black Tuxedo" appearance (second variant).
    await page.click('[data-testid="appearance-black-tuxedo"]');
    // Select a trait: "Playful".
    await page.click('[data-testid="trait-playful"]');

    // Create the cat.
    const beforeRevision = beforeView.revision;
    await page.click('[data-testid="create-cat-btn"]');
    const afterView = await waitForCommit(page, householdId, beforeRevision);

    // Cat count increased by 1.
    const afterCount = Object.keys(afterView.view.cats).length;
    expect(afterCount).toBe(beforeCount + 1);

    // New cat has correct fields.
    const newCats = Object.entries(afterView.view.cats).filter(([id]) => id !== 'mochi');
    expect(newCats).toHaveLength(1);
    const [, luna] = newCats[0];
    expect(luna.name).toBe('Luna');
    expect(luna.appearance.variant).toBe('black-tuxedo');
    expect(luna.traits[0].id).toBe('playful');
  });

  test('blank name keeps create button disabled', async ({ page }) => {
    await openScenario(page, 'cat-creator-blank', { autoCreate: true });

    await expect(page.locator('[data-testid="create-cat-btn"]')).toBeVisible({ timeout: 10000 });
    // Button starts disabled because name is empty.
    await expect(page.locator('[data-testid="create-cat-btn"]')).toBeDisabled();

    await page.fill('input[type="text"]', '   ');
    // Still disabled (whitespace-only).
    await expect(page.locator('[data-testid="create-cat-btn"]')).toBeDisabled();

    await page.fill('input[type="text"]', 'Luna');
    // Now enabled.
    await expect(page.locator('[data-testid="create-cat-btn"]')).toBeEnabled();
  });

  test('Unicode names are accepted', async ({ page }) => {
    const { householdId } = await openScenario(page, 'cat-creator-unicode', { autoCreate: true });

    await page.fill('input[type="text"]', 'ねこちゃん');
    const beforeView = await readCommittedView(page, householdId);
    const beforeRevision = beforeView.revision;
    await page.click('[data-testid="create-cat-btn"]');
    const afterView = await waitForCommit(page, householdId, beforeRevision);

    const newCat = Object.entries(afterView.view.cats).find(([, c]) => c.name === 'ねこちゃん');
    expect(newCat).toBeDefined();
    if (newCat) {
      expect(newCat[1].name).toBe('ねこちゃん');
    }
  });

  test('capacity enforced — eighth new cat succeeds, ninth fails', async ({ page }) => {
    const { householdId, token } = await openScenario(page, 'cat-creator-capacity', { autoCreate: true });

    // Start with 1 cat (Mochi). Create 7 more to reach 8 (R20 max living cats).
    let revision = (await readCommittedView(page, householdId)).revision;
    for (let i = 1; i <= 7; i++) {
      const res = await page.request.post(`${DEV_BASE}/api/households/${householdId}/command`, {
        data: JSON.stringify({
          type: 'create-cat',
          payload: {
            name: `Cat${i}`,
            appearance: { variant: 'orange-tabby' },
            traits: [],
          },
        }),
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
      });
      expect(res.status()).toBe(200);
      const view = await waitForCommit(page, householdId, revision);
      expect(Object.keys(view.view.cats).length).toBe(i + 1);
      revision = view.revision;
    }

    // Now at 8 cats — reload so the UI reflects the updated count.
    await page.reload();
    await page.waitForSelector('[data-testid="create-cat-btn"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="create-cat-btn"]')).toBeDisabled();
    await expect(page.locator('text=/Maximum.*cats reached/i')).toBeVisible();

    // Attempting an eighth new cat (ninth total) via API should fail with 409.
    const res = await page.request.post(`${DEV_BASE}/api/households/${householdId}/command`, {
      data: JSON.stringify({
        type: 'create-cat',
        payload: {
          name: 'Overflow',
          appearance: { variant: 'orange-tabby' },
          traits: [],
        },
      }),
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
      },
    });
    expect(res.status()).toBe(409);
  });

  test('trait preview updates with selection', async ({ page }) => {
    await openScenario(page, 'cat-creator-preview', { autoCreate: true });

    await expect(page.locator('[data-testid="create-cat-btn"]')).toBeVisible({ timeout: 10000 });

    await page.fill('input[type="text"]', 'Patch');
    // Select two traits.
    await page.click('[data-testid="trait-playful"]');
    await page.click('[data-testid="trait-affectionate"]');

    // Preview should show both trait labels.
    const preview = page.locator('[data-testid="cat-preview"]');
    await expect(preview.locator('text=/Playful/i')).toBeVisible();
    await expect(preview.locator('text=/Affectionate/i')).toBeVisible();
    // The cat name appears in the preview.
    await expect(preview.locator('text=/Patch/i')).toBeVisible();
  });
});
