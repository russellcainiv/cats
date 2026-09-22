// scripts/screenshot-pr.mjs — Capture before/after desktop + mobile screenshots for the PR.
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3000';
const SS_DIR = path.resolve(__dirname, '../docs/pr-screenshots');

async function screenshotsFor(device) {
  const { width, height, label } = device;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height } });

  const res = await ctx.request.post(`${BASE}/api/dev/issue-session`, {
    data: JSON.stringify({ ownerId: `pr-screenshot-${label}-${Date.now()}` }),
    headers: { 'Content-Type': 'application/json' },
  });
  const { token } = await res.json();
  await ctx.addCookies([{
    name: 'cats-session', value: token, domain: 'localhost', path: '/',
    httpOnly: false, secure: false, sameSite: 'Lax',
  }]);

  const page = await ctx.newPage();

  // Before: CreateForm visible
  await page.goto(`${BASE}/game`);
  await page.waitForSelector('text=Create household', { timeout: 10000 });
  await page.screenshot({ path: `${SS_DIR}/${label}-before-create.png`, fullPage: true });
  console.log(`saved ${label}-before-create.png`);

  // After: fill + create → HouseholdShell
  await page.getByLabel('Household name').fill('Sunny perch');
  await page.getByRole('button', { name: /Create household/i }).click();
  await page.waitForSelector('text=Household ready', { timeout: 10000 });
  await page.screenshot({ path: `${SS_DIR}/${label}-after-create.png`, fullPage: true });
  console.log(`saved ${label}-after-create.png`);

  // CATS-3: Enter home → World Feature
  await page.getByRole('button', { name: 'Enter home' }).click();
  await page.waitForSelector('[data-testid="move-cat"]', { timeout: 10000 });
  await page.screenshot({ path: `${SS_DIR}/${label}-after-launch.png`, fullPage: true });
  console.log(`saved ${label}-after-launch.png`);

  // CATS-4: Pause + save status + Continue here visible
  await page.screenshot({ path: `${SS_DIR}/${label}-world-ui.png`, fullPage: true });
  console.log(`saved ${label}-world-ui.png`);

  await browser.close();
}

const devices = [
  { width: 1280, height: 800, label: '01-desktop' },
  { width: 390, height: 844, label: '03-mobile' },
];

(async () => {
  for (const d of devices) await screenshotsFor(d);
  console.log('All screenshots captured.');
})().catch(e => { console.error(e); process.exit(1); });
