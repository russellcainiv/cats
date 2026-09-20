// tests/domain/economy/regression.test.ts
// Comprehensive regression test suite verifying all economy repairs.

import { describe, test, expect } from 'bun:test';
import {
  initializeEconomyState,
  reduceEconomy,
  advanceEconomy,
  getVisibleOutfit,
  CAREER_CONFIGS,
  CROP_CONFIGS,
  CAFE_RECIPES,
  GOAL_DEFINITIONS,
  CAREER_OUTFITS,
  SeededRng
} from '../../../src/domain/economy/index';

function createTestWorld(options?: { earnedCash?: number; mode?: 'normal' | 'free-build-committed' }) {
  const earnedCash = options?.earnedCash ?? 500;
  const mode = options?.mode ?? 'normal';
  const economy = initializeEconomyState(earnedCash);
  economy.wallet.mode = mode;

  return {
    schemaVersion: 1,
    catalogVersion: 1,
    householdId: 'house_test',
    householdName: 'Repair Haven',
    ownerId: 'owner_1',
    revision: 1,
    clock: { simMinute: 600, isPaused: false, speed: 1 },
    rng: { seed: 9999, counter: 0, serializedState: new SeededRng(9999).serialize() },
    selectedCatId: 'cat_mochi',
    livingCatIds: ['cat_mochi', 'cat_taro'],
    cats: {
      cat_mochi: {
        id: 'cat_mochi',
        name: 'Mochi',
        lifeStatus: 'living',
        lifeStage: 'adult',
        appearance: {
          breed: 'domestic_shorthair',
          primaryColor: '#F5E6D3',
          pattern: 'solid',
          eyeColor: 'blue',
          bodyType: 'petite',
          collarColor: '#FF0000',
          accessoryId: 'bell_gold'
        },
        traits: ['curious'],
        skills: { painting: 3, gardening: 3, social: 3 },
        position: { lotId: 'lot_home', x: 2, y: 2, facing: 'south' }
      },
      cat_taro: {
        id: 'cat_taro',
        name: 'Taro',
        lifeStatus: 'living',
        lifeStage: 'adult',
        appearance: {
          breed: 'tabby',
          primaryColor: '#888888',
          pattern: 'tabby',
          eyeColor: 'green',
          bodyType: 'average',
          collarColor: '#00FF00'
        },
        traits: ['lazy'],
        skills: { painting: 1, gardening: 1, social: 1 },
        position: { lotId: 'lot_home', x: 4, y: 4, facing: 'north' }
      }
    },
    building: {
      lots: {
        lot_home: {
          id: 'lot_home',
          objects: [],
          walls: []
        }
      },
      activeFreeBuild: mode !== 'normal'
    },
    social: {
      recentInteractions: []
    },
    economy,
    neighborhood: {
      shopInventory: [
        { catalogId: 'gourmet_catnip', price: 15, stock: 20 },
        { catalogId: 'deluxe_scratching_post', price: 85, stock: 5 }
      ]
    },
    lifecycle: {
      pregnancies: {},
      memorials: {},
      ghosts: []
    },
    commandReceipts: [],
    events: [],
    nextEventSequence: 1
  };
}

describe('1. Money Invariants & Numerical Exploits (SEC-01 & NUM-01)', () => {
  const ctx = { actorId: 'player', commandId: 'cmd_money_sec' };

  test('RESTOCK_CAFE rejects negative amounts and does not mint money', () => {
    let state = createTestWorld({ earnedCash: 1000 });
    // Buy cafe
    let res = reduceEconomy(state, { type: 'BUY_CAFE_BUSINESS', payload: {} }, ctx);
    expect(res.ok).toBe(true);
    state = res.state;
    const initialCash = state.economy.wallet.earnedCash; // 500

    // Try negative amounts
    const negRes = reduceEconomy(state, { type: 'RESTOCK_CAFE', payload: { recipeId: 'fish_pie', amount: -10 } }, ctx);
    expect(negRes.ok).toBe(false);
    expect(negRes.error?.code).toBe('INVALID_AMOUNT');
    expect(negRes.state.economy.wallet.earnedCash).toBe(initialCash);
  });

  test('RESTOCK_CAFE rejects -Infinity, Infinity and NaN', () => {
    let state = createTestWorld({ earnedCash: 1000 });
    state = reduceEconomy(state, { type: 'BUY_CAFE_BUSINESS', payload: {} }, ctx).state;
    const initialCash = state.economy.wallet.earnedCash;

    for (const badAmount of [-Infinity, Infinity, NaN, 1.5, 0, -0.5]) {
      const res = reduceEconomy(state, { type: 'RESTOCK_CAFE', payload: { recipeId: 'fish_pie', amount: badAmount } }, ctx);
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe('INVALID_AMOUNT');
      expect(res.state.economy.wallet.earnedCash).toBe(initialCash);
      expect(Number.isFinite(res.state.economy.wallet.earnedCash)).toBe(true);
    }
  });

  test('BUY_ITEM rejects NaN, negative, nonfinite and fractional quantities', () => {
    const state = createTestWorld({ earnedCash: 500 });
    for (const badQty of [NaN, -1, 0, 1.5, Infinity, -Infinity]) {
      const res = reduceEconomy(state, { type: 'BUY_ITEM', payload: { catalogId: 'toy_ball', quantity: badQty } }, ctx);
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe('INVALID_QUANTITY');
      expect(res.state.economy.wallet.earnedCash).toBe(500);
      expect(res.state.economy.inventory['toy_ball']).toBeUndefined();
    }
  });

  test('SELL_ITEM rejects NaN, negative, nonfinite and fractional quantities', () => {
    const state = createTestWorld({ earnedCash: 500 });
    state.economy.inventory['item_crop_tomato'] = {
      id: 'item_crop_tomato',
      catalogId: 'item_crop_tomato',
      quantity: 10,
      provenance: 'earned'
    };

    for (const badQty of [NaN, -2, 0, 2.5, Infinity, -Infinity]) {
      const res = reduceEconomy(state, { type: 'SELL_ITEM', payload: { itemId: 'item_crop_tomato', quantity: badQty } }, ctx);
      expect(res.ok).toBe(false);
      expect(res.error?.code).toBe('INVALID_QUANTITY');
      expect(res.state.economy.wallet.earnedCash).toBe(500);
      expect(res.state.economy.inventory['item_crop_tomato'].quantity).toBe(10);
    }
  });

  test('Stale / invalid entity IDs are rejected before any side effect', () => {
    const state = createTestWorld({ earnedCash: 500 });
    // Invalid catId on join
    const res1 = reduceEconomy(state, { type: 'JOIN_CAREER', payload: { catId: 'non_existent_cat', careerId: 'cafe_assistant' } }, ctx);
    expect(res1.ok).toBe(false);
    expect(res1.error?.code).toBe('INVALID_CAT');

    // Invalid artworkId on sell
    const res2 = reduceEconomy(state, { type: 'SELL_ARTWORK', payload: { artworkId: 'art_fake_999' } }, ctx);
    expect(res2.ok).toBe(false);
    expect(res2.error?.code).toBe('ARTWORK_NOT_FOUND');

    // Invalid goalId on claim
    const res3 = reduceEconomy(state, { type: 'CLAIM_GOAL_REWARD', payload: { goalId: 'goal_fake_xyz' } }, ctx);
    expect(res3.ok).toBe(false);
    expect(res3.error?.code).toBe('GOAL_NOT_COMPLETED');
  });
});

describe('2. Failed-Command State and RNG Immutability', () => {
  test('Rejected commands return unchanged state and unchanged RNG', () => {
    const state = createTestWorld({ earnedCash: 300 });
    const originalJson = JSON.stringify(state);
    const originalRngSnapshot = state.rng.serializedState;
    const originalRngCounter = state.rng.counter;

    // Dispatch failing command
    const res = reduceEconomy(state, { type: 'BUY_ITEM', payload: { catalogId: 'toy_ball', quantity: NaN } }, { actorId: 'user', commandId: 'c1' });
    expect(res.ok).toBe(false);

    // Assert exact byte identity
    expect(JSON.stringify(res.state)).toBe(originalJson);
    expect(res.state.rng.serializedState).toBe(originalRngSnapshot);
    expect(res.state.rng.counter).toBe(originalRngCounter);
  });
});

describe('3. Deterministic Seeded RNG & Stable IDs (No Math.random or Date.now)', () => {
  test('Artwork finish produces deterministic stable ID and reproducible quality from seed', () => {
    const state1 = createTestWorld();
    state1.clock.simMinute = 500;
    state1.cats.cat_mochi.skills.painting = 6;
    state1.economy.extensions.easels['easel_1'] = {
      easelObjectId: 'easel_1',
      currentCatId: 'cat_mochi',
      progressMinutes: 60,
      targetMinutes: 60,
      artworkTitle: 'Seeded Sunset'
    };

    const state2 = JSON.parse(JSON.stringify(state1));

    const res1 = reduceEconomy(state1, { type: 'FINISH_PAINTING', payload: { catId: 'cat_mochi', easelObjectId: 'easel_1' } }, { actorId: 'a', commandId: 'c1' });
    const res2 = reduceEconomy(state2, { type: 'FINISH_PAINTING', payload: { catId: 'cat_mochi', easelObjectId: 'easel_1' } }, { actorId: 'a', commandId: 'c1' });

    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);

    const art1 = Object.values(res1.state.economy.extensions.artworks)[0] as any;
    const art2 = Object.values(res2.state.economy.extensions.artworks)[0] as any;

    expect(art1.id).toBe(art2.id);
    expect(art1.id.startsWith('art_cat_mochi_500_')).toBe(true);
    expect(art1.quality).toBe(art2.quality);
    expect(art1.value).toBe(art2.value);
    expect(res1.state.rng.counter).toBe(res2.state.rng.counter);
    expect(res1.state.rng.serializedState).toBe(res2.state.rng.serializedState);
  });

  test('Cafe order generation in advanceEconomy is deterministic with SeededRng', () => {
    const state1 = createTestWorld();
    state1.economy.cafe.owned = true;
    state1.economy.extensions.cafeDetails.owned = true;
    state1.economy.extensions.cafeDetails.isOpen = true;
    state1.economy.extensions.cafeDetails.lastOrderCheckSimMinute = 0;
    state1.clock.simMinute = 100;

    const state2 = JSON.parse(JSON.stringify(state1));

    const adv1 = advanceEconomy(state1, 30);
    const adv2 = advanceEconomy(state2, 30);

    const orders1 = adv1.economy.extensions.cafeDetails.activeOrders;
    const orders2 = adv2.economy.extensions.cafeDetails.activeOrders;

    expect(orders1.length).toBe(orders2.length);
    expect(orders1[0].recipeId).toBe(orders2[0].recipeId);
    expect(orders1[0].customerId).toBe(orders2[0].customerId);
    expect(orders1[0].orderId).toBe(orders2[0].orderId);
  });
});

describe('4. Zero Clock Increment Invariant in Advance', () => {
  test('advanceEconomy does NOT mutate state.clock.simMinute', () => {
    const state = createTestWorld();
    state.clock.simMinute = 250;

    const advancedState = advanceEconomy(state, 60);
    expect(advancedState.clock.simMinute).toBe(250); // Unchanged! Engine advances clock once at step boundary
  });
});

describe('5. Career Outfits, Commute & Promotions for all 3 Careers', () => {
  const ctx = { actorId: 'user', commandId: 'cmd_career' };

  test('Track 1: cafe_assistant full shift, commute, outfit and 3-rank promotion cycle', () => {
    let state = createTestWorld({ earnedCash: 500 });
    const catId = 'cat_mochi';

    // 1. Join career at rank 1
    state = reduceEconomy(state, { type: 'JOIN_CAREER', payload: { catId, careerId: 'cafe_assistant' } }, ctx).state;
    expect(state.economy.careers[catId].rank).toBe(1);
    expect(state.economy.careers[catId].hourlyWage).toBe(15);
    expect(getVisibleOutfit(state, catId).isWorking).toBe(false);

    // 2. Depart for work (commute stage)
    state = reduceEconomy(state, { type: 'DEPART_FOR_WORK', payload: { catId } }, ctx).state;
    let outfit = getVisibleOutfit(state, catId);
    expect(outfit.isWorking).toBe(true);
    expect(outfit.outfitId).toBe('cafe_apron');
    expect(outfit.outfitDetails?.body).toBe('apron_green');
    expect(state.cats[catId].isAtWork).toBe(true);
    expect(state.cats[catId].careerOutfit?.outfitId).toBe('cafe_apron');
    expect(state.cats[catId].appearance.primaryColor).toBe('#F5E6D3'); // coat preserved!
    expect(state.cats[catId].appearance.accessoryId).toBe('bell_gold'); // accessory preserved!

    // 3. Arrive at work
    state = reduceEconomy(state, { type: 'ARRIVE_AT_WORK', payload: { catId } }, ctx).state;
    expect(state.economy.extensions.workStates[catId].status).toBe('working');

    // 4. Mid-shift save / resume test
    const saved = JSON.stringify(state);
    state = JSON.parse(saved);
    expect(getVisibleOutfit(state, catId).outfitId).toBe('cafe_apron');

    // 5. Finish shift after 8 hours: earns 8 * $15 = $120
    state.clock.simMinute += 480;
    state = reduceEconomy(state, { type: 'FINISH_WORK_SHIFT', payload: { catId } }, ctx).state;
    expect(state.economy.wallet.earnedCash).toBe(620);
    expect(getVisibleOutfit(state, catId).isWorking).toBe(false);
    expect(getVisibleOutfit(state, catId).outfitId).toBeNull();
    expect(state.cats[catId].isAtWork).toBe(false);
    expect(state.cats[catId].careerOutfit).toBeNull();

    // 6. Complete required shifts for promotion to rank 2
    state.economy.careers[catId].shiftsWorkedAtCurrentRank = 3;
    state.cats[catId].skills.social = 3;

    // Promote to Rank 2 (Head Barista, $25/hr)
    let promRes = reduceEconomy(state, { type: 'PROMOTE_CAREER', payload: { catId } }, ctx);
    expect(promRes.ok).toBe(true);
    state = promRes.state;
    expect(state.economy.careers[catId].rank).toBe(2);
    expect(state.economy.careers[catId].title).toBe('Head Barista');
    expect(state.economy.careers[catId].hourlyWage).toBe(25);

    // Complete shift at rank 2: earns 8 * $25 = $200
    state = reduceEconomy(state, { type: 'START_WORK_SHIFT', payload: { catId } }, ctx).state;
    state.clock.simMinute += 480;
    state = reduceEconomy(state, { type: 'FINISH_WORK_SHIFT', payload: { catId } }, ctx).state;
    expect(state.economy.wallet.earnedCash).toBe(620 + 200);

    // Promote to Rank 3 (Café Manager, $40/hr)
    state.economy.careers[catId].shiftsWorkedAtCurrentRank = 7;
    state.cats[catId].skills.social = 6;
    promRes = reduceEconomy(state, { type: 'PROMOTE_CAREER', payload: { catId } }, ctx);
    expect(promRes.ok).toBe(true);
    state = promRes.state;
    expect(state.economy.careers[catId].rank).toBe(3);
    expect(state.economy.careers[catId].title).toBe('Café Manager');
    expect(state.economy.careers[catId].hourlyWage).toBe(40);

    // Complete shift at rank 3: earns 8 * $40 = $320
    state = reduceEconomy(state, { type: 'START_WORK_SHIFT', payload: { catId } }, ctx).state;
    state.clock.simMinute += 480;
    state = reduceEconomy(state, { type: 'FINISH_WORK_SHIFT', payload: { catId } }, ctx).state;
    expect(state.economy.wallet.earnedCash).toBe(820 + 320);

    // Promotion beyond rank 3 is rejected
    const maxRankRes = reduceEconomy(state, { type: 'PROMOTE_CAREER', payload: { catId } }, ctx);
    expect(maxRankRes.ok).toBe(false);
    expect(maxRankRes.error?.code).toBe('MAX_RANK_REACHED');
  });

  test('Track 2: garden_keeper full shift, overalls/sunhat outfit and 3-rank promotion cycle', () => {
    let state = createTestWorld({ earnedCash: 500 });
    const catId = 'cat_taro';

    state = reduceEconomy(state, { type: 'JOIN_CAREER', payload: { catId, careerId: 'garden_keeper' } }, ctx).state;
    expect(state.economy.careers[catId].rank).toBe(1);
    expect(state.economy.careers[catId].hourlyWage).toBe(12);

    // Start shift equips gardener overalls and straw sunhat
    state = reduceEconomy(state, { type: 'START_WORK_SHIFT', payload: { catId } }, ctx).state;
    let outfit = getVisibleOutfit(state, catId);
    expect(outfit.outfitId).toBe('gardener_overalls_sunhat');
    expect(outfit.outfitDetails?.body).toBe('overalls_denim');
    expect(outfit.outfitDetails?.hat).toBe('sunhat_straw');
    expect(state.cats[catId].careerOutfit?.outfitId).toBe('gardener_overalls_sunhat');

    // Finish shift: earns 8 * $12 = $96
    state.clock.simMinute += 480;
    state = reduceEconomy(state, { type: 'FINISH_WORK_SHIFT', payload: { catId } }, ctx).state;
    expect(state.economy.wallet.earnedCash).toBe(596);
    expect(getVisibleOutfit(state, catId).outfitId).toBeNull();

    // Advance to rank 2 ($22/hr) and rank 3 ($38/hr)
    state.cats[catId].skills.gardening = 3;
    state.economy.careers[catId].shiftsWorkedAtCurrentRank = 3;
    state = reduceEconomy(state, { type: 'PROMOTE_CAREER', payload: { catId } }, ctx).state;
    expect(state.economy.careers[catId].rank).toBe(2);
    expect(state.economy.careers[catId].hourlyWage).toBe(22);

    state.cats[catId].skills.gardening = 6;
    state.economy.careers[catId].shiftsWorkedAtCurrentRank = 7;
    state = reduceEconomy(state, { type: 'PROMOTE_CAREER', payload: { catId } }, ctx).state;
    expect(state.economy.careers[catId].rank).toBe(3);
    expect(state.economy.careers[catId].hourlyWage).toBe(38);
  });

  test('Track 3: gallery_helper full shift, smock/beret outfit and 3-rank promotion cycle', () => {
    let state = createTestWorld({ earnedCash: 500 });
    const catId = 'cat_mochi';

    state = reduceEconomy(state, { type: 'JOIN_CAREER', payload: { catId, careerId: 'gallery_helper' } }, ctx).state;
    expect(state.economy.careers[catId].rank).toBe(1);
    expect(state.economy.careers[catId].hourlyWage).toBe(18);

    // Start shift equips smock and red beret
    state = reduceEconomy(state, { type: 'START_WORK_SHIFT', payload: { catId } }, ctx).state;
    let outfit = getVisibleOutfit(state, catId);
    expect(outfit.outfitId).toBe('gallery_helper_smock_beret');
    expect(outfit.outfitDetails?.body).toBe('smock_artist');
    expect(outfit.outfitDetails?.hat).toBe('beret_red');

    // Cancel shift restores ordinary look immediately
    state = reduceEconomy(state, { type: 'CANCEL_WORK_SHIFT', payload: { catId } }, ctx).state;
    expect(getVisibleOutfit(state, catId).outfitId).toBeNull();
    expect(state.cats[catId].isAtWork).toBe(false);

    // Advance to rank 2 ($28/hr) and rank 3 ($45/hr)
    state.cats[catId].skills.painting = 3;
    state.economy.careers[catId].shiftsWorkedAtCurrentRank = 3;
    state = reduceEconomy(state, { type: 'PROMOTE_CAREER', payload: { catId } }, ctx).state;
    expect(state.economy.careers[catId].rank).toBe(2);
    expect(state.economy.careers[catId].hourlyWage).toBe(28);

    state.cats[catId].skills.painting = 6;
    state.economy.careers[catId].shiftsWorkedAtCurrentRank = 7;
    state = reduceEconomy(state, { type: 'PROMOTE_CAREER', payload: { catId } }, ctx).state;
    expect(state.economy.careers[catId].rank).toBe(3);
    expect(state.economy.careers[catId].hourlyWage).toBe(45);
  });

  test('Mid-shift job switch cancels active shift and restores everyday look', () => {
    let state = createTestWorld({ earnedCash: 500 });
    const catId = 'cat_mochi';

    state = reduceEconomy(state, { type: 'JOIN_CAREER', payload: { catId, careerId: 'cafe_assistant' } }, ctx).state;
    state = reduceEconomy(state, { type: 'START_WORK_SHIFT', payload: { catId } }, ctx).state;
    expect(getVisibleOutfit(state, catId).outfitId).toBe('cafe_apron');

    // Switch to gallery_helper
    state = reduceEconomy(state, { type: 'JOIN_CAREER', payload: { catId, careerId: 'gallery_helper' } }, ctx).state;
    const outfit = getVisibleOutfit(state, catId);
    expect(outfit.isWorking).toBe(false);
    expect(outfit.outfitId).toBeNull();
    expect(outfit.careerId).toBe('gallery_helper');
  });
});

describe('6. Evidence-Driven Evaluation of All 18 Goals', () => {
  test('All 18 goals evaluate correctly based on world state evidence', () => {
    let state = createTestWorld();

    // Verify all 18 goals are present in state
    expect(Object.keys(state.economy.goals).length).toBe(18);

    // 1. Care goals
    state.cats.cat_mochi.needs = { hunger: 80, hygiene: 80, energy: 80, comfort: 80, social: 80, fun: 80, health: 80 };
    state.cats.cat_taro.needs = { hunger: 80, hygiene: 80, energy: 80, comfort: 80, social: 80, fun: 80, health: 80 };
    state.events.push({ id: 'e1', type: 'DIRECT_CARE', sequence: 1, simTime: 100, actorIds: ['cat_mochi'], payload: {} });
    state = advanceEconomy(state, 1);
    expect(state.economy.goals.goal_care_1.completed).toBe(true);
    expect(state.economy.goals.goal_care_2.completed).toBe(true);

    // 2. Relationships goals
    state.cats.cat_mochi.relationships = {
      cat_taro: { targetCatId: 'cat_taro', friendship: 60, romance: 90, isLove: true, lastInteractionMinute: 100 }
    };
    state = advanceEconomy(state, 1);
    expect(state.economy.goals.goal_relationships_1.completed).toBe(true);
    expect(state.economy.goals.goal_relationships_2.completed).toBe(true);

    // 3. Building goals (earned only)
    state.building.lots.lot_home.objects = [
      { id: 'o1', catalogId: 'chair', provenance: 'earned' },
      { id: 'o2', catalogId: 'table', provenance: 'earned' },
      { id: 'o3', catalogId: 'lamp', provenance: 'earned' },
      { id: 'o4', catalogId: 'bed', provenance: 'earned' },
      { id: 'o5', catalogId: 'bowl', provenance: 'earned' }
    ];
    state.building.lots.lot_home.walls = [{ id: 'w1', provenance: 'earned' }];
    state = advanceEconomy(state, 1);
    expect(state.economy.goals.goal_building_1.completed).toBe(true);
    expect(state.economy.goals.goal_building_2.completed).toBe(true);

    // 4. Work goals & promotion
    state.economy.careers['cat_mochi'] = { catId: 'cat_mochi', careerId: 'cafe_assistant', rank: 2 };
    state.economy.extensions.workStates['cat_mochi'] = { daysWorked: 5 } as any;
    state = advanceEconomy(state, 1);
    expect(state.economy.goals.goal_work_1.completed).toBe(true);
    expect(state.economy.goals.goal_work_2.completed).toBe(true);
    expect(state.economy.goals.goal_work_3.completed).toBe(true);

    // 5. Hobbies goals (artworks and crops)
    state.economy.extensions.artworks['art_1'] = { id: 'art_1', quality: 'masterpiece', provenance: 'earned' } as any;
    state.economy.extensions.stats.totalCropsHarvested = 3;
    state.economy.extensions.stats.cropsHarvested['catnip'] = 1;
    state = advanceEconomy(state, 1);
    expect(state.economy.goals.goal_hobbies_1.completed).toBe(true);
    expect(state.economy.goals.goal_hobbies_2.completed).toBe(true);
    expect(state.economy.goals.goal_hobbies_3.completed).toBe(true);
    expect(state.economy.goals.goal_hobbies_4.completed).toBe(true);

    // 6. Business goals
    state.economy.cafe.owned = true;
    state.economy.extensions.cafeDetails.owned = true;
    state.economy.extensions.cafeDetails.isOpen = true;
    state.economy.extensions.cafeDetails.totalOrdersServed = 10;
    state = advanceEconomy(state, 1);
    expect(state.economy.goals.goal_business_1.completed).toBe(true);
    expect(state.economy.goals.goal_business_2.completed).toBe(true);

    // 7. Neighborhood goals
    state.cats.cat_mochi.position.lotId = 'park';
    state.social.recentInteractions = [
      { fromId: 'cat_mochi', toId: 'npc_cat_barnaby', type: 'chat', simMinute: 100 },
      { fromId: 'cat_mochi', toId: 'npc_cat_cleo', type: 'chat', simMinute: 100 },
      { fromId: 'cat_mochi', toId: 'npc_cat_felix', type: 'chat', simMinute: 100 }
    ];
    state = advanceEconomy(state, 1);
    expect(state.economy.goals.goal_neighborhood_1.completed).toBe(true);
    expect(state.economy.goals.goal_neighborhood_2.completed).toBe(true);

    // 8. Legacy goal
    state.cats.kitten_pip = { id: 'kitten_pip', lifeStatus: 'living', lifeStage: 'kitten' } as any;
    state = advanceEconomy(state, 1);
    expect(state.economy.goals.goal_legacy_1.completed).toBe(true);

    // Assert ALL 18 goals completed with evidence!
    const completedCount = Object.values(state.economy.goals).filter((g: any) => g.completed).length;
    expect(completedCount).toBe(18);
  });

  test('Free-build actions do NOT counterfeit earned goals', () => {
    let state = createTestWorld({ mode: 'free-build-committed' });
    state.building.lots.lot_home.objects = [
      { id: 'fb_1', catalogId: 'chair', provenance: 'free_build' },
      { id: 'fb_2', catalogId: 'table', provenance: 'free_build' },
      { id: 'fb_3', catalogId: 'lamp', provenance: 'free_build' },
      { id: 'fb_4', catalogId: 'bed', provenance: 'free_build' },
      { id: 'fb_5', catalogId: 'bowl', provenance: 'free_build' }
    ];
    state.building.lots.lot_home.walls = [{ id: 'w_fb', provenance: 'free_build' }];
    state.economy.extensions.artworks['art_fb'] = { id: 'art_fb', quality: 'masterpiece', provenance: 'free_build' } as any;

    state = advanceEconomy(state, 1);

    expect(state.economy.goals.goal_building_1.completed).toBe(false);
    expect(state.economy.goals.goal_building_2.completed).toBe(false);
    expect(state.economy.goals.goal_hobbies_2.completed).toBe(false);
  });
});

describe('7. Once-Only Settlement and Idempotency', () => {
  const ctx = { actorId: 'user', commandId: 'cmd_once_settle' };

  test('Goal reward claim settles cash once; second claim rejected', () => {
    let state = createTestWorld({ earnedCash: 500 });
    state.economy.goals.goal_care_1.completed = true;

    // Claim reward ($50)
    let res = reduceEconomy(state, { type: 'CLAIM_GOAL_REWARD', payload: { goalId: 'goal_care_1' } }, ctx);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.economy.wallet.earnedCash).toBe(550);

    // Re-claim attempt
    res = reduceEconomy(state, { type: 'CLAIM_GOAL_REWARD', payload: { goalId: 'goal_care_1' } }, ctx);
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe('ALREADY_CLAIMED');
    expect(res.state.economy.wallet.earnedCash).toBe(550);
  });

  test('Central commandReceipts logs executed commands', () => {
    let state = createTestWorld({ earnedCash: 500 });
    const cmdContext = { actorId: 'user', commandId: 'unique_receipt_cmd_123' };

    const res = reduceEconomy(state, { type: 'BUY_ITEM', payload: { catalogId: 'toy_ball', quantity: 1 } }, cmdContext);
    expect(res.ok).toBe(true);
    expect(res.state.commandReceipts.length).toBeGreaterThan(0);
    const receipt = res.state.commandReceipts.find((r: any) => r.commandId === 'unique_receipt_cmd_123');
    expect(receipt).toBeDefined();
    expect(receipt.type).toBe('BUY_ITEM');
    expect(receipt.success).toBe(true);
  });
});
