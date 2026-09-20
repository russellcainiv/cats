import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createInitialWorldState } from './harness';
import { reduceBuilding } from '../src/domain/building/index';

test('render building subsystem verification view', async ({ page }) => {
  // Build state with walls, door, window, furniture, floor finishes and free build mode
  let state = createInitialWorldState();
  const ctx = { actorId: 'verifier', commandId: 'v1' };

  state = reduceBuilding(state, {
    type: 'BUY_AND_PLACE_OBJECT',
    payload: { lotId: 'lot_home', catalogId: 'seat_cushion_sofa', x: 4, y: 4, rotation: 0, colorVariant: 'sage' }
  }, { ...ctx, commandId: 'v1' }).state!;

  state = reduceBuilding(state, {
    type: 'BUY_AND_PLACE_OBJECT',
    payload: { lotId: 'lot_home', catalogId: 'sleep_cat_donut_bed', x: 7, y: 4, colorVariant: 'fluffy_pink' }
  }, { ...ctx, commandId: 'v2' }).state!;

  state = reduceBuilding(state, {
    type: 'BUY_AND_PLACE_OBJECT',
    payload: { lotId: 'lot_home', catalogId: 'play_cat_tree_tower', x: 10, y: 4, rotation: 90 }
  }, { ...ctx, commandId: 'v3' }).state!;

  state = reduceBuilding(state, {
    type: 'ENTER_FREE_BUILD',
    payload: {}
  }, { ...ctx, commandId: 'v4' }).state!;

  state = reduceBuilding(state, {
    type: 'BUY_AND_PLACE_OBJECT',
    payload: { lotId: 'lot_home', catalogId: 'skill_painting_easel', x: 14, y: 4 }
  }, { ...ctx, commandId: 'v5' }).state!;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; background: #2c2d30; color: #fff; margin: 0; padding: 20px; }
    .header { background: #3b3d42; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .badge { background: #e07a5f; color: #fff; padding: 4px 12px; border-radius: 12px; font-weight: bold; }
    .grid-container { display: grid; grid-template-columns: repeat(20, 28px); grid-template-rows: repeat(20, 28px); gap: 1px; background: #1a1b1e; padding: 10px; border-radius: 8px; width: fit-content; border: 2px solid #555; }
    .cell { background: #33373e; position: relative; border-radius: 2px; }
    .cell.wall { background: #7f8c8d; }
    .cell.door { background: #e67e22; }
    .cell.object { background: #27ae60; color: white; font-size: 10px; display: flex; align-items: center; justify-content: center; }
    .cell.free-object { background: #8e44ad; color: white; font-size: 10px; display: flex; align-items: center; justify-content: center; }
    .cell.cat { background: #f39c12; border: 2px solid #fff; border-radius: 50%; }
    .legend { margin-top: 20px; display: flex; gap: 15px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 14px; }
    .color-box { width: 16px; height: 16px; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2 style="margin:0;">Cats Building Engine - Live Lot Layout Verification</h2>
      <p style="margin:4px 0 0 0; color: #aaa;">Lot: Home (20x20) | Household Cash: $${state.economy.wallet.earnedCash} | Objects Placed: ${state.building.lots.lot_home.objects.length}</p>
    </div>
    <span class="badge">FREE-BUILD MODE ACTIVE</span>
  </div>

  <div class="grid-container">
    ${Array.from({ length: 400 }).map((_, idx) => {
      const x = idx % 20;
      const y = Math.floor(idx / 20);
      const lot = state.building.lots.lot_home;

      const isWall = lot.walls.some(w => {
        const minX = Math.min(w.x1, w.x2);
        const maxX = Math.max(w.x1, w.x2);
        const minY = Math.min(w.y1, w.y2);
        const maxY = Math.max(w.y1, w.y2);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      });

      const isDoor = lot.doors.some(d => d.x === x && d.y === y);

      const obj = lot.objects.find(o => {
        const w = o.width;
        const h = o.height;
        return x >= o.x && x < o.x + w && y >= o.y && y < o.y + h;
      });

      const isCat = Object.values(state.cats).some(c => Math.floor(c.position.x) === x && Math.floor(c.position.y) === y);

      let classes = 'cell';
      let content = '';

      if (isCat) {
        classes += ' cat';
      } else if (obj) {
        classes += obj.provenance === 'free_build' ? ' free-object' : ' object';
        content = obj.name.substring(0, 3);
      } else if (isDoor) {
        classes += ' door';
      } else if (isWall) {
        classes += ' wall';
      }

      return `<div class="${classes}">${content}</div>`;
    }).join('')}
  </div>

  <div class="legend">
    <div class="legend-item"><div class="color-box" style="background: #7f8c8d;"></div> Wall</div>
    <div class="legend-item"><div class="color-box" style="background: #e67e22;"></div> Door</div>
    <div class="legend-item"><div class="color-box" style="background: #27ae60;"></div> Earned Object</div>
    <div class="legend-item"><div class="color-box" style="background: #8e44ad;"></div> Free Build Object</div>
    <div class="legend-item"><div class="color-box" style="background: #f39c12;"></div> Cat Position</div>
  </div>
</body>
</html>
  `;

  await page.setContent(htmlContent);
  await page.setViewportSize({ width: 800, height: 750 });
  const verificationPath = path.join(__dirname, 'verification.png');
  await page.screenshot({ path: verificationPath, fullPage: true });
  expect(fs.existsSync(verificationPath)).toBe(true);
});
