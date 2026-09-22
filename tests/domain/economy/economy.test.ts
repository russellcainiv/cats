// tests/domain/economy/economy.test.ts

import assert from 'assert';
import {
  initializeEconomyState,
  reduceEconomy,
  advanceEconomy,
  getVisibleOutfit,
  CAREER_OUTFITS
} from '../../../src/domain/economy/index';

function createMockWorldState() {
  const economy = initializeEconomyState(500);
  return {
    schemaVersion: 1,
    catalogVersion: 1,
    householdId: 'house_1',
    householdName: 'Whiskers Haven',
    ownerId: 'owner_1',
    revision: 1,
    clock: { simMinute: 100, isPaused: false, speed: 1 },
    rng: { seed: 12345, counter: 1, serializedState: '' },
    selectedCatId: 'cat_1',
    livingCatIds: ['cat_1'],
    cats: {
      cat_1: {
        id: 'cat_1',
        name: 'Mochi',
        lifeStatus: 'alive',
        skills: { painting: 3, gardening: 2, social: 1 }
      }
    },
    building: {},
    social: {},
    economy,
    neighborhood: {},
    lifecycle: {},
    commandReceipts: [],
    events: [],
    nextEventSequence: 1
  };
}

const context = { actorId: 'user_1', commandId: 'cmd_1' };

console.log('Running Economy Subsystem Tests...\n');

// 1. Career & Outfit Tests
{
  console.log('[Test 1] Career Join, Start Shift, Outfit Projection & Finish Shift');
  let state = createMockWorldState();

  // Join career
  let res = reduceEconomy(state, { type: 'JOIN_CAREER', payload: { catId: 'cat_1', careerId: 'cafe_assistant' } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;

  let outfit = getVisibleOutfit(state, 'cat_1');
  assert.strictEqual(outfit.isWorking, false);
  assert.strictEqual(outfit.outfitId, null);

  // Start shift
  res = reduceEconomy(state, { type: 'START_WORK_SHIFT', payload: { catId: 'cat_1' } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;

  outfit = getVisibleOutfit(state, 'cat_1');
  assert.strictEqual(outfit.isWorking, true);
  assert.strictEqual(outfit.outfitId, 'cafe_apron');
  assert.strictEqual(outfit.outfitDetails?.body, 'apron_green');

  // Mid-shift state reload simulation (ensure outfit persists after serialization)
  const serialized = JSON.stringify(state);
  state = JSON.parse(serialized);
  outfit = getVisibleOutfit(state, 'cat_1');
  assert.strictEqual(outfit.isWorking, true);
  assert.strictEqual(outfit.outfitId, 'cafe_apron');

  // Finish shift
  state.clock.simMinute += 480; // 8 hours later
  res = reduceEconomy(state, { type: 'FINISH_WORK_SHIFT', payload: { catId: 'cat_1' } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;

  outfit = getVisibleOutfit(state, 'cat_1');
  assert.strictEqual(outfit.isWorking, false);
  assert.strictEqual(outfit.outfitId, null); // Ordinary appearance restored
  assert.strictEqual(state.economy.wallet.earnedCash, 620); // 500 + 8*15 wage
  console.log('  PASSED: Career shift workflow and outfit projection verified.');
}

// 2. Career Cancellation & Outfit Cleanup
{
  console.log('[Test 2] Work Shift Cancellation & Ordinary Appearance Restoration');
  let state = createMockWorldState();

  let res = reduceEconomy(state, { type: 'JOIN_CAREER', payload: { catId: 'cat_1', careerId: 'garden_keeper' } }, context);
  state = res.state;

  res = reduceEconomy(state, { type: 'START_WORK_SHIFT', payload: { catId: 'cat_1' } }, context);
  state = res.state;

  let outfit = getVisibleOutfit(state, 'cat_1');
  assert.strictEqual(outfit.outfitId, 'gardener_overalls_sunhat');

  // Cancel shift
  res = reduceEconomy(state, { type: 'CANCEL_WORK_SHIFT', payload: { catId: 'cat_1' } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;

  outfit = getVisibleOutfit(state, 'cat_1');
  assert.strictEqual(outfit.isWorking, false);
  assert.strictEqual(outfit.outfitId, null);
  console.log('  PASSED: Shift cancellation restores ordinary appearance.');
}

// 3. Painting Crafting, WIP, Quality & Sale
{
  console.log('[Test 3] Painting Crafting, Progress, Quality and Single Settlement Sale');
  let state = createMockWorldState();

  // Start painting
  let res = reduceEconomy(state, { type: 'START_PAINTING', payload: { catId: 'cat_1', easelObjectId: 'easel_1' } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;

  // Progress painting
  res = reduceEconomy(state, { type: 'PROGRESS_PAINTING', payload: { catId: 'cat_1', easelObjectId: 'easel_1', elapsedMinutes: 60 } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;

  // Finish painting
  res = reduceEconomy(state, { type: 'FINISH_PAINTING', payload: { catId: 'cat_1', easelObjectId: 'easel_1' } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;

  const artworks = Object.values(state.economy.extensions.artworks);
  assert.strictEqual(artworks.length, 1);
  const artwork = artworks[0] as any;
  assert.strictEqual(artwork.artistCatId, 'cat_1');
  assert.strictEqual(artwork.provenance, 'earned');

  // Sell artwork
  const initialCash = state.economy.wallet.earnedCash;
  res = reduceEconomy(state, { type: 'SELL_ARTWORK', payload: { artworkId: artwork.id } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;

  assert.strictEqual(state.economy.wallet.earnedCash, initialCash + artwork.value);
  assert.strictEqual(Object.keys(state.economy.extensions.artworks).length, 0);

  // Attempt double sale (negative case)
  res = reduceEconomy(state, { type: 'SELL_ARTWORK', payload: { artworkId: artwork.id } }, context);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error?.code, 'ARTWORK_NOT_FOUND');
  console.log('  PASSED: Painting creation, quality and double-sale prevention verified.');
}

// 4. Gardening Lifecycle, Water & Harvest
{
  console.log('[Test 4] Tomato Planting, Water, Advance Tick & Harvest');
  let state = createMockWorldState();

  // Plant tomato (cost 10)
  let res = reduceEconomy(state, { type: 'PLANT_CROP', payload: { plotObjectId: 'plot_1', cropType: 'tomato' } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;
  assert.strictEqual(state.economy.wallet.earnedCash, 490);

  // Advance time by 120 sim minutes
  state = advanceEconomy(state, 120);

  const plot = state.economy.extensions.gardenPlots['plot_1'];
  assert.strictEqual(plot.isHarvestable, true);

  // Harvest crop
  res = reduceEconomy(state, { type: 'HARVEST_CROP', payload: { plotObjectId: 'plot_1' } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;

  const cropItem = state.economy.inventory['item_crop_tomato'];
  assert.notStrictEqual(cropItem, undefined);
  assert.strictEqual(cropItem.quantity, 3);

  // Sell produce
  res = reduceEconomy(state, { type: 'SELL_ITEM', payload: { itemId: 'item_crop_tomato', quantity: 3 } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;
  assert.strictEqual(state.economy.wallet.earnedCash, 490 + 3 * 8); // 514
  console.log('  PASSED: Gardening lifecycle and produce sale verified.');
}

// 5. Café Business Ownership, Supplies & Orders
{
  console.log('[Test 5] Café Business Purchase, Restock and Order Fulfillment');
  let state = createMockWorldState();

  // Purchase café (cost 500)
  let res = reduceEconomy(state, { type: 'BUY_CAFE_BUSINESS', payload: {} }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;
  assert.strictEqual(state.economy.wallet.earnedCash, 0);
  assert.strictEqual(state.economy.cafe.owned, true);

  // Restock requires cash -> attempt restock with 0 cash should fail
  res = reduceEconomy(state, { type: 'RESTOCK_CAFE', payload: { recipeId: 'cream_bun', amount: 2 } }, context);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error?.code, 'INSUFFICIENT_FUNDS');

  // Add cash and restock
  state.economy.wallet.earnedCash = 100;
  res = reduceEconomy(state, { type: 'RESTOCK_CAFE', payload: { recipeId: 'cream_bun', amount: 2 } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;
  assert.strictEqual(state.economy.cafe.supplies['cream_bun'], 2);

  // Advance time to generate customer orders
  state = advanceEconomy(state, 30);
  const orders = state.economy.extensions.cafeDetails.activeOrders;
  assert.ok(orders.length > 0);

  const orderId = orders[0].orderId;
  const recipeId = orders[0].recipeId;
  state.economy.cafe.supplies[recipeId] = 5; // ensure stock for order

  const cashBefore = state.economy.wallet.earnedCash;
  res = reduceEconomy(state, { type: 'SERVE_CAFE_CUSTOMER', payload: { orderId } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;
  assert.ok(state.economy.wallet.earnedCash > cashBefore);
  console.log('  PASSED: Café business acquisition, restocking, and order serving verified.');
}

// 6. Free-Build Mode Money Provenance Invariant
{
  console.log('[Test 6] Free-Build Mode Provenance & Non-Minting Invariant');
  let state = createMockWorldState();
  state.economy.wallet = { mode: 'free-build-preview', earnedCash: 100, freeBuildCash: 10000 };

  // Plant crop in free-build
  let res = reduceEconomy(state, { type: 'PLANT_CROP', payload: { plotObjectId: 'plot_free', cropType: 'catnip' } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;
  // Earned cash should be unchanged
  assert.strictEqual(state.economy.wallet.earnedCash, 100);

  // Advance 180, water, advance 180 and harvest
  state = advanceEconomy(state, 180);
  res = reduceEconomy(state, { type: 'WATER_CROP', payload: { plotObjectId: 'plot_free' } }, context);
  state = res.state;
  state = advanceEconomy(state, 180);

  res = reduceEconomy(state, { type: 'HARVEST_CROP', payload: { plotObjectId: 'plot_free' } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;

  // Sell item created in free build mode -> must not mint earned cash
  res = reduceEconomy(state, { type: 'SELL_ITEM', payload: { itemId: 'item_crop_catnip', quantity: 5 } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;
  assert.strictEqual(state.economy.wallet.earnedCash, 100);
  console.log('  PASSED: Free-build mode provenance prevents cash/progression minting.');
}

// 7. Goals Claiming & Idempotency
{
  console.log('[Test 7] Goal Rewards Claiming & Idempotency');
  let state = createMockWorldState();

  // Complete care goal manually
  state.economy.goals['goal_care_1'].completed = true;

  let res = reduceEconomy(state, { type: 'CLAIM_GOAL_REWARD', payload: { goalId: 'goal_care_1' } }, context);
  assert.strictEqual(res.ok, true);
  state = res.state;
  assert.strictEqual(state.economy.wallet.earnedCash, 550); // 500 + 50 reward

  // Attempt duplicate claim
  res = reduceEconomy(state, { type: 'CLAIM_GOAL_REWARD', payload: { goalId: 'goal_care_1' } }, context);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error?.code, 'ALREADY_CLAIMED');
  console.log('  PASSED: Goal reward claiming and single payout enforced.');
}

console.log('\nALL ECONOMY TESTS PASSED SUCCESSFULLY!');
