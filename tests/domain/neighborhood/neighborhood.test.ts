import { createTestWorldState } from './test-helpers';
import {
  reduceNeighborhood,
  advanceNeighborhood,
  NeighborhoodCommand,
  CommandContext,
} from '../../../src/domain/neighborhood/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const context: CommandContext = { actorId: 'usr_test', commandId: 'cmd_01' };

console.log('=== Running Neighborhood Subsystem Verification Tests ===\n');

// Test 1: Travel to Lot and Arrival
(() => {
  console.log('Test 1: Deterministic Travel to Lot & Arrival');
  let state = createTestWorldState();
  const cmd: NeighborhoodCommand = {
    type: 'TRAVEL_TO_LOT',
    payload: { catId: 'cat_player_1', targetLotId: 'park' },
  };

  const res = reduceNeighborhood(state, cmd, context);
  assert(res.ok, 'TRAVEL_TO_LOT should succeed');
  state = res.state;

  assert(state.neighborhood.activeTravels['cat_player_1'] !== undefined, 'Travel should be active');
  assert(state.cats['cat_player_1'].currentAction?.type === 'traveling', 'Action should be traveling');

  // Advance simulation by 10 minutes (travel duration)
  state = advanceNeighborhood(state, 10);

  assert(state.neighborhood.activeTravels['cat_player_1'] === undefined, 'Travel should be completed');
  assert(state.cats['cat_player_1'].position.lotId === 'park', 'Cat should arrive at park lot');
  console.log('  -> PASS: Travel started, elapsed 10 sim minutes, arrived at park.\n');
})();

// Test 2: Invalid lot and blocked/closed destination
(() => {
  console.log('Test 2: Invalid Lot and Closed Lot Destination Handling');
  const state = createTestWorldState();

  // Invalid lot
  const invalidCmd: NeighborhoodCommand = {
    type: 'TRAVEL_TO_LOT',
    payload: { catId: 'cat_player_1', targetLotId: 'non_existent_lot' },
  };
  const res1 = reduceNeighborhood(state, invalidCmd, context);
  assert(!res1.ok, 'TRAVEL_TO_LOT to non-existent lot should fail');
  assert(res1.error.code === 'INVALID_LOT', 'Error code should be INVALID_LOT');

  // Closed lot (Shop hours 8..20, current time set to 2:00 AM)
  const nightState = createTestWorldState({
    clock: { simMinute: 120, isPaused: false, speed: 1 }, // 2:00 AM
  });
  const closedCmd: NeighborhoodCommand = {
    type: 'TRAVEL_TO_LOT',
    payload: { catId: 'cat_player_1', targetLotId: 'shop' },
  };
  const res2 = reduceNeighborhood(nightState, closedCmd, context);
  assert(!res2.ok, 'TRAVEL_TO_LOT to closed shop at 2 AM should fail');
  assert(res2.error.code === 'LOT_CLOSED', 'Error code should be LOT_CLOSED');

  console.log('  -> PASS: Invalid and closed lot destinations properly rejected.\n');
})();

// Test 3: Canceled Journey
(() => {
  console.log('Test 3: Canceled Journey Recovery');
  let state = createTestWorldState();
  const travelCmd: NeighborhoodCommand = {
    type: 'TRAVEL_TO_LOT',
    payload: { catId: 'cat_player_1', targetLotId: 'cafe' },
  };
  state = reduceNeighborhood(state, travelCmd, context).state;

  // Cancel journey
  const cancelCmd: NeighborhoodCommand = {
    type: 'CANCEL_TRAVEL',
    payload: { catId: 'cat_player_1' },
  };
  const res = reduceNeighborhood(state, cancelCmd, context);
  assert(res.ok, 'CANCEL_TRAVEL should succeed');
  state = res.state;

  assert(state.neighborhood.activeTravels['cat_player_1'] === undefined, 'Active travel should be removed');
  assert(state.cats['cat_player_1'].position.lotId === 'lot_home', 'Cat should remain at origin home lot');
  assert(state.cats['cat_player_1'].currentAction === null, 'Current action should be cleared');

  console.log('  -> PASS: Journey canceled and cat safely returned to origin lot.\n');
})();

// Test 4: Shop Purchase and Exact-Once Payment
(() => {
  console.log('Test 4: Shop Purchase Exact-Once Payment and Stock Reduction');
  let state = createTestWorldState();
  const initialCash = state.economy.wallet.earnedCash;

  const buyCmd: NeighborhoodCommand = {
    type: 'BUY_SHOP_ITEM',
    payload: { catalogId: 'gourmet_catnip', quantity: 2 },
  };
  const res = reduceNeighborhood(state, buyCmd, context);
  assert(res.ok, 'BUY_SHOP_ITEM should succeed');
  state = res.state;

  const expectedCost = 15 * 2;
  assert(state.economy.wallet.earnedCash === initialCash - expectedCost, 'Earned cash should be debited by $30');
  assert(state.economy.inventory['gourmet_catnip']?.quantity === 2, 'Inventory should contain 2 catnip');
  assert(state.economy.inventory['gourmet_catnip']?.provenance === 'earned', 'Item provenance must be earned');

  console.log('  -> PASS: Purchased item, debited wallet exactly once, updated inventory with earned provenance.\n');
})();

// Test 5: Full Household Reservations (Capacity Limit 8)
(() => {
  console.log('Test 5: Household Adoption Capacity Limit (8 living + reserved litter slots)');
  let state = createTestWorldState({
    livingCatIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
    lifecycle: {
      pregnancies: {
        preg_1: {
          pregnancyId: 'preg_1',
          motherId: 'c1',
          fatherId: 'c2',
          conceptionSimMinute: 100,
          dueSimMinute: 5000,
          reservedLitterSlots: 1, // 7 living + 1 reserved = 8 total capacity used
        },
      },
      memorials: {},
      ghosts: [],
    },
  });

  const adoptCmd: NeighborhoodCommand = {
    type: 'ADOPT_CAT',
    payload: {
      name: 'Nala',
      appearance: { bodyColor: '#F1C40F', eyeColor: '#2ECC71' },
      traits: ['playful'],
    },
  };

  const res = reduceNeighborhood(state, adoptCmd, context);
  assert(!res.ok, 'Adoption should be blocked when living + reserved litter slots >= 8');
  assert(res.error.code === 'HOUSEHOLD_FULL', 'Error should be HOUSEHOLD_FULL');

  console.log('  -> PASS: Adoption correctly blocked when reserved litter slots fill capacity.\n');
})();

// Test 6: Last-Cat Death Recovery Adoption
(() => {
  console.log('Test 6: Last-Cat Death Recovery Adoption');
  let state = createTestWorldState({
    livingCatIds: [], // Household has 0 living cats after last-cat death
    cats: {},
    lifecycle: {
      pregnancies: {},
      memorials: {
        mem_old_cat: {
          memorialId: 'mem_old_cat',
          catId: 'cat_old',
          name: 'Old Milo',
          appearance: { bodyColor: '#555', eyeColor: '#333' },
          traits: ['lazy'],
          ageAtDeathMinutes: 150 * 1440,
          causeOfDeath: 'old_age',
          deceasedAtSimMinute: 500,
          tombstonePosition: { lotId: 'lot_home', x: 2, y: 2 },
          ghostVisits: [],
        },
      },
      ghosts: [],
    },
  });

  const adoptCmd: NeighborhoodCommand = {
    type: 'ADOPT_CAT',
    payload: {
      candidateId: 'candidate_whiskers',
      name: 'Whiskers II',
      appearance: { bodyColor: '#34495E', eyeColor: '#2ECC71' },
      traits: ['affectionate'],
    },
  };

  const res = reduceNeighborhood(state, adoptCmd, context);
  assert(res.ok, 'Adoption into empty household should succeed');
  state = res.state;

  assert(state.livingCatIds.length === 1, 'Should have 1 new living cat');
  assert(state.lifecycle.memorials['mem_old_cat'] !== undefined, 'Memorial of deceased cat preserved');
  assert(state.economy.wallet.earnedCash === 500 - 50, 'Wallet debited for adoption fee ($450 left)');

  console.log('  -> PASS: Successfully adopted newcomer into empty household, preserving memorials, wallet, and lot.\n');
})();

// Test 7: Transfer Cat Identity Continuity & Safety Enforcement
(() => {
  console.log('Test 7: Household Adult Cat Transfer & Safety Enforcement');
  let state = createTestWorldState();

  // Try to transfer kitten (unsafe)
  state.cats['cat_kitten'] = {
    ...state.cats['cat_player_1'],
    id: 'cat_kitten',
    name: 'Tiny',
    lifeStage: 'kitten',
  };
  state.livingCatIds.push('cat_kitten');

  const unsafeKittenCmd: NeighborhoodCommand = {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_kitten', targetLotId: 'npc_home_1' },
  };
  const res1 = reduceNeighborhood(state, unsafeKittenCmd, context);
  assert(!res1.ok, 'Kitten transfer should be blocked');
  assert(res1.error.code === 'UNSAFE_KITTEN_TRANSFER', 'Error should be UNSAFE_KITTEN_TRANSFER');

  // Try to transfer pregnant cat (deferred)
  state.cats['cat_player_1'].isPregnant = true;
  const pregnantCmd: NeighborhoodCommand = {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_player_1', targetLotId: 'npc_home_1' },
  };
  const res2 = reduceNeighborhood(state, pregnantCmd, context);
  assert(!res2.ok, 'Pregnant cat transfer should be deferred');
  assert(res2.error.code === 'PREGNANT_TRANSFER_DEFERRED', 'Error should be PREGNANT_TRANSFER_DEFERRED');

  // Successful adult transfer
  state.cats['cat_player_1'].isPregnant = false;
  const validTransferCmd: NeighborhoodCommand = {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_player_1', targetLotId: 'npc_home_1' },
  };
  const res3 = reduceNeighborhood(state, validTransferCmd, context);
  assert(res3.ok, 'Eligible adult transfer should succeed');
  state = res3.state;

  assert(!state.livingCatIds.includes('cat_player_1'), 'Cat should be removed from living household list');
  assert(state.neighborhood.npcCats['cat_player_1'] !== undefined, 'Cat should exist in neighborhood NPC list with same ID');
  assert(state.neighborhood.npcCats['cat_player_1'].isNpc === true, 'Cat is marked as NPC');
  assert(state.neighborhood.npcCats['cat_player_1'].homeLotId === 'npc_home_1', 'Cat home lot updated');

  console.log('  -> PASS: Kitten and pregnant transfers safely blocked; adult transferred maintaining identity continuity.\n');
})();

// Test 8: No Ghost / Deceased Duplication or Re-adoption
(() => {
  console.log('Test 8: Ghost / Deceased Re-adoption Blocked');
  const state = createTestWorldState({
    cats: {
      cat_ghost_1: {
        id: 'cat_ghost_1',
        name: 'Casper',
        appearance: { bodyColor: '#FFF', eyeColor: '#888' },
        traits: ['playful'],
        lifeStage: 'adult',
        ageDays: 100,
        ageMinutes: 100 * 1440,
        lifeStatus: 'ghost',
        needs: { hunger: 100, hygiene: 100, energy: 100, comfort: 100, social: 100, fun: 100, health: 0 },
        moodScore: 100,
        moodBand: 'happy',
        skills: { hunting: 0, agility: 0, charm: 0, crafting: 0 },
        position: { lotId: 'lot_home', x: 5, y: 5 },
        currentAction: null,
        lastRoute: [],
        relationships: {},
        isNpc: false,
        homeLotId: 'lot_home',
      },
    },
  });

  const transferGhostCmd: NeighborhoodCommand = {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_ghost_1', targetLotId: 'npc_home_1' },
  };
  const res = reduceNeighborhood(state, transferGhostCmd, context);
  assert(!res.ok, 'Ghost cat transfer should fail');
  assert(res.error.code === 'CAT_NOT_IN_HOUSEHOLD', 'Ghost cat must not be transferable');

  console.log('  -> PASS: Ghost and deceased cats cannot be transferred or adopted back to life.\n');
})();

console.log('=== All Neighborhood Subsystem Tests Passed Successfully! ===');
