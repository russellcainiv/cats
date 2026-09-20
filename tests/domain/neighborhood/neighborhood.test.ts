import { createTestWorldState } from './test-helpers';
import {
  reduceNeighborhood,
  advanceNeighborhood,
  NeighborhoodCommand,
  CommandContext,
  INITIAL_NEIGHBORHOOD_LOTS,
  INITIAL_NPC_CATS,
  INITIAL_SHOP_INVENTORY,
  INITIAL_ADOPTION_CANDIDATES,
  getHouseholdCapacityUsed,
  isCatActivelyPregnant,
} from '../../../src/domain/neighborhood/index';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const context: CommandContext = { actorId: 'usr_test', commandId: 'cmd_01' };

console.log('=== Running Neighborhood Subsystem Verification Tests ===\n');

// Test 1: Travel to Lot and Arrival
(() => {
  console.log('Test 1: Deterministic Travel to Lot & Arrival (10 min duration)');
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

  // Advance simulation by 5 minutes: journey in progress
  state = advanceNeighborhood(state, 5);
  assert(state.neighborhood.activeTravels['cat_player_1'] !== undefined, 'Travel still active at 5 min');
  assert(state.neighborhood.activeTravels['cat_player_1'].elapsedMinutes === 5, 'Elapsed should be 5 min');

  // Advance simulation by remaining 5 minutes (total 10 minutes)
  state = advanceNeighborhood(state, 5);

  assert(state.neighborhood.activeTravels['cat_player_1'] === undefined, 'Travel should be completed');
  assert(state.cats['cat_player_1'].position.lotId === 'park', 'Cat should arrive at park lot');
  assert(state.cats['cat_player_1'].currentAction === null, 'Action should be cleared');
  console.log('  -> PASS: Travel started, intermediate progress checked, arrived at park after 10 sim minutes.\n');
})();

// Test 2: Invalid lot, empty ID, already at destination, and closed lot
(() => {
  console.log('Test 2: Invalid Lot and Closed Lot Destination Handling');
  const state = createTestWorldState();

  // Invalid / non-existent lot
  const invalidCmd: NeighborhoodCommand = {
    type: 'TRAVEL_TO_LOT',
    payload: { catId: 'cat_player_1', targetLotId: 'non_existent_lot' },
  };
  const res1 = reduceNeighborhood(state, invalidCmd, context);
  assert(!res1.ok, 'TRAVEL_TO_LOT to non-existent lot should fail');
  assert(res1.error.code === 'INVALID_LOT', 'Error code should be INVALID_LOT');

  // Already at destination
  const sameLotCmd: NeighborhoodCommand = {
    type: 'TRAVEL_TO_LOT',
    payload: { catId: 'cat_player_1', targetLotId: 'lot_home' },
  };
  const resSame = reduceNeighborhood(state, sameLotCmd, context);
  assert(!resSame.ok, 'TRAVEL_TO_LOT to current lot should fail');
  assert(resSame.error.code === 'ALREADY_AT_DESTINATION', 'Error code should be ALREADY_AT_DESTINATION');

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

  console.log('  -> PASS: Invalid, current-lot, and closed lot destinations properly rejected.\n');
})();

// Test 3: Canceled Journey and Return Home
(() => {
  console.log('Test 3: Canceled Journey Recovery & Return Home');
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

  // Travel to park and then RETURN_HOME
  const toParkRes = reduceNeighborhood(state, { type: 'TRAVEL_TO_LOT', payload: { catId: 'cat_player_1', targetLotId: 'park' } }, context);
  assert(toParkRes.ok, 'Travel to park should succeed');
  state = advanceNeighborhood(toParkRes.state, 10);
  assert(state.cats['cat_player_1'].position.lotId === 'park', 'Cat at park');

  const returnRes = reduceNeighborhood(state, { type: 'RETURN_HOME', payload: { catId: 'cat_player_1' } }, context);
  assert(returnRes.ok, 'RETURN_HOME should succeed');
  state = advanceNeighborhood(returnRes.state, 10);
  assert(state.cats['cat_player_1'].position.lotId === 'lot_home', 'Cat safely returned to lot_home');

  console.log('  -> PASS: Journey canceled and return home safely executed.\n');
})();

// Test 4: Shop Purchase, Quantity Validation & Numerical Safety
(() => {
  console.log('Test 4: Shop Purchase Exact-Once Payment and Numerical Validation');
  let state = createTestWorldState();
  const initialCash = state.economy.wallet.earnedCash;

  // 4a. Valid purchase
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
  const shopStock = state.neighborhood.shopInventory.find(i => i.catalogId === 'gourmet_catnip')?.stock;
  assert(shopStock === 18, `Shop stock should be decremented to 18 (was ${shopStock})`);

  // 4b. Rejection of negative quantity
  const negRes = reduceNeighborhood(state, { type: 'BUY_SHOP_ITEM', payload: { catalogId: 'gourmet_catnip', quantity: -5 } }, context);
  assert(!negRes.ok, 'Negative quantity must fail');
  assert(negRes.error.code === 'INVALID_QUANTITY', 'Error should be INVALID_QUANTITY');
  assert(negRes.state.economy.wallet.earnedCash === state.economy.wallet.earnedCash, 'Wallet unmodified on negative qty');

  // 4c. Rejection of zero quantity
  const zeroRes = reduceNeighborhood(state, { type: 'BUY_SHOP_ITEM', payload: { catalogId: 'gourmet_catnip', quantity: 0 } }, context);
  assert(!zeroRes.ok, 'Zero quantity must fail');
  assert(zeroRes.error.code === 'INVALID_QUANTITY', 'Error should be INVALID_QUANTITY');

  // 4d. Rejection of fractional quantity (e.g. 1.5)
  const fracRes = reduceNeighborhood(state, { type: 'BUY_SHOP_ITEM', payload: { catalogId: 'gourmet_catnip', quantity: 1.5 } }, context);
  assert(!fracRes.ok, 'Fractional quantity must fail');
  assert(fracRes.error.code === 'INVALID_QUANTITY', 'Error should be INVALID_QUANTITY');

  // 4e. Rejection of NaN quantity
  const nanRes = reduceNeighborhood(state, { type: 'BUY_SHOP_ITEM', payload: { catalogId: 'gourmet_catnip', quantity: NaN } }, context);
  assert(!nanRes.ok, 'NaN quantity must fail');
  assert(nanRes.error.code === 'INVALID_QUANTITY', 'Error should be INVALID_QUANTITY');

  // 4f. Rejection of Infinity quantity
  const infRes = reduceNeighborhood(state, { type: 'BUY_SHOP_ITEM', payload: { catalogId: 'gourmet_catnip', quantity: Infinity } }, context);
  assert(!infRes.ok, 'Infinity quantity must fail');
  assert(infRes.error.code === 'INVALID_QUANTITY', 'Error should be INVALID_QUANTITY');

  // 4g. Insufficient stock
  const overStockRes = reduceNeighborhood(state, { type: 'BUY_SHOP_ITEM', payload: { catalogId: 'gourmet_catnip', quantity: 100 } }, context);
  assert(!overStockRes.ok, 'Buying more than stock must fail');
  assert(overStockRes.error.code === 'INSUFFICIENT_STOCK', 'Error should be INSUFFICIENT_STOCK');

  // 4h. Insufficient funds
  const brokeState = createTestWorldState({ economy: { ...state.economy, wallet: { ...state.economy.wallet, earnedCash: 10 } } });
  const brokeRes = reduceNeighborhood(brokeState, { type: 'BUY_SHOP_ITEM', payload: { catalogId: 'gourmet_catnip', quantity: 2 } }, context);
  assert(!brokeRes.ok, 'Insufficient funds must fail');
  assert(brokeRes.error.code === 'INSUFFICIENT_FUNDS', 'Error should be INSUFFICIENT_FUNDS');

  console.log('  -> PASS: Valid purchase debits wallet once; negative, fractional, NaN, and over-limit quantities securely rejected.\n');
})();

// Test 5: Full Household Capacity with Canonical reservedSlots
(() => {
  console.log('Test 5: Household Adoption Capacity Limit with canonical reservedSlots (8 max)');
  
  // 5a. Engine canonical schema: uses `reservedSlots`
  let state = createTestWorldState({
    livingCatIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
    lifecycle: {
      pregnancies: {
        preg_canon: {
          id: 'preg_canon',
          parentIds: ['c1', 'c2'],
          startedAtSimMinute: 100,
          dueAtSimMinute: 4420,
          reservedSlots: 1, // 7 living + 1 reserved = 8
          conceptionEventId: 'evt_01',
        },
      },
      memorials: {},
      ghosts: [],
    },
  });

  const capUsed = getHouseholdCapacityUsed(state);
  assert(capUsed.reservedSlots === 1, `Canonical reservedSlots should be 1 (got ${capUsed.reservedSlots})`);
  assert(capUsed.totalUsed === 8, `Total used should be 8 (got ${capUsed.totalUsed})`);

  const adoptCmd: NeighborhoodCommand = {
    type: 'ADOPT_CAT',
    payload: {
      name: 'Nala',
      appearance: { primaryColor: '#F1C40F', eyeColor: 'amber' },
      traits: ['playful'],
    },
  };

  const res1 = reduceNeighborhood(state, adoptCmd, context);
  assert(!res1.ok, 'Adoption should be blocked when living (7) + canonical reservedSlots (1) >= 8');
  assert(res1.error.code === 'HOUSEHOLD_FULL', `Error should be HOUSEHOLD_FULL (got ${res1.error.code})`);

  // 5b. Backwards compatibility: legacy `reservedLitterSlots` also respected
  const legacyState = createTestWorldState({
    livingCatIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
    lifecycle: {
      pregnancies: {
        preg_leg: {
          pregnancyId: 'preg_leg',
          motherId: 'c1',
          fatherId: 'c2',
          conceptionSimMinute: 100,
          dueSimMinute: 5000,
          reservedLitterSlots: 1,
        },
      },
      memorials: {},
      ghosts: [],
    },
  });

  const res2 = reduceNeighborhood(legacyState, adoptCmd, context);
  assert(!res2.ok, 'Adoption should be blocked with legacy reservedLitterSlots');
  assert(res2.error.code === 'HOUSEHOLD_FULL', 'Error should be HOUSEHOLD_FULL');

  // 5c. Adoption succeeds when space exists (e.g. 6 living + 1 reserved = 7 < 8)
  const roomState = createTestWorldState({
    livingCatIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
    lifecycle: {
      pregnancies: {
        preg_canon: {
          id: 'preg_canon',
          parentIds: ['c1', 'c2'],
          startedAtSimMinute: 100,
          dueAtSimMinute: 4420,
          reservedSlots: 1,
          conceptionEventId: 'evt_01',
        },
      },
      memorials: {},
      ghosts: [],
    },
  });

  const res3 = reduceNeighborhood(roomState, adoptCmd, context);
  assert(res3.ok, 'Adoption should succeed when living + reserved < 8');
  assert(res3.state.livingCatIds.length === 7, 'Living count should now be 7');

  console.log('  -> PASS: Canonical reservedSlots and legacy reservedLitterSlots correctly count toward 8-cat limit.\n');
})();

// Test 6: Authoritative Active Pregnancy Detection Blocks Transfer
(() => {
  console.log('Test 6: Authoritative Active Pregnancy Detection Blocks Transfer');
  let state = createTestWorldState();
  state.cats['cat_player_1'].lifeStage = 'adult';

  // 6a. Cat has canonical pregnancyId matching authoritative record
  state.cats['cat_player_1'].pregnancyId = 'preg_auth_1';
  state.lifecycle.pregnancies['preg_auth_1'] = {
    id: 'preg_auth_1',
    parentIds: ['cat_player_1', 'cat_other'],
    startedAtSimMinute: 100,
    dueAtSimMinute: 4420,
    reservedSlots: 2,
    conceptionEventId: 'evt_conc',
  };
  state.cats['cat_player_1'].isPregnant = undefined; // engine cat has no boolean flag

  assert(isCatActivelyPregnant(state, 'cat_player_1', state.cats['cat_player_1']) === true, 'Should detect pregnancy from pregnancyId + record');

  const transferCmd: NeighborhoodCommand = {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_player_1', targetLotId: 'npc_home_1' },
  };
  const res1 = reduceNeighborhood(state, transferCmd, context);
  assert(!res1.ok, 'Pregnant cat transfer must be deferred');
  assert(res1.error.code === 'PREGNANT_TRANSFER_DEFERRED', `Expected PREGNANT_TRANSFER_DEFERRED, got ${res1.error.code}`);

  // 6b. Cat is gestating parent in parentIds[0] even if cat.pregnancyId was not set
  state.cats['cat_player_1'].pregnancyId = undefined;
  assert(isCatActivelyPregnant(state, 'cat_player_1', state.cats['cat_player_1']) === true, 'Should detect pregnancy from parentIds[0]');
  const res2 = reduceNeighborhood(state, transferCmd, context);
  assert(!res2.ok, 'Pregnant cat transfer deferred via parentIds[0]');
  assert(res2.error.code === 'PREGNANT_TRANSFER_DEFERRED', 'Error code should be PREGNANT_TRANSFER_DEFERRED');

  // 6c. Non-gestating father (parentIds[1]) is NOT pregnant
  state.cats['cat_father'] = {
    ...state.cats['cat_player_1'],
    id: 'cat_father',
    name: 'Papa Cat',
  };
  state.livingCatIds.push('cat_father');
  assert(isCatActivelyPregnant(state, 'cat_father', state.cats['cat_father']) === false, 'Father should not be considered pregnant');

  // 6d. Legacy isPregnant boolean flag check
  delete state.lifecycle.pregnancies['preg_auth_1'];
  state.cats['cat_player_1'].isPregnant = true;
  assert(isCatActivelyPregnant(state, 'cat_player_1', state.cats['cat_player_1']) === true, 'Legacy isPregnant detected');
  const res3 = reduceNeighborhood(state, transferCmd, context);
  assert(!res3.ok, 'Legacy pregnant flag blocks transfer');
  assert(res3.error.code === 'PREGNANT_TRANSFER_DEFERRED', 'Error code should be PREGNANT_TRANSFER_DEFERRED');

  console.log('  -> PASS: Active pregnancy reliably detected via canonical records, gestating parentId, and pregnancyId.\n');
})();

// Test 7: Unsafe Transfers, Double IDs, and Wrong Owner/Destination
(() => {
  console.log('Test 7: Unsafe Transfers, Double IDs, and Wrong Destination Rejection');
  let state = createTestWorldState();

  // 7a. Kitten transfer rejected
  state.cats['cat_kitten'] = {
    ...state.cats['cat_player_1'],
    id: 'cat_kitten',
    name: 'Tiny',
    lifeStage: 'kitten',
  };
  state.livingCatIds.push('cat_kitten');
  const kittenRes = reduceNeighborhood(state, {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_kitten', targetLotId: 'npc_home_1' },
  }, context);
  assert(!kittenRes.ok, 'Kitten transfer must be rejected');
  assert(kittenRes.error.code === 'UNSAFE_KITTEN_TRANSFER', 'Error code UNSAFE_KITTEN_TRANSFER');

  // 7b. Adolescent transfer rejected
  state.cats['cat_adol'] = {
    ...state.cats['cat_player_1'],
    id: 'cat_adol',
    name: 'Youngster',
    lifeStage: 'adolescent',
  };
  state.livingCatIds.push('cat_adol');
  const adolRes = reduceNeighborhood(state, {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_adol', targetLotId: 'npc_home_1' },
  }, context);
  assert(!adolRes.ok, 'Adolescent transfer must be rejected');
  assert(adolRes.error.code === 'UNSAFE_KITTEN_TRANSFER', 'Error code UNSAFE_KITTEN_TRANSFER');

  // 7c. Deceased / ghost cat transfer rejected
  state.cats['cat_ghost'] = {
    ...state.cats['cat_player_1'],
    id: 'cat_ghost',
    name: 'Spooky',
    lifeStatus: 'deceased',
  };
  const ghostRes = reduceNeighborhood(state, {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_ghost', targetLotId: 'npc_home_1' },
  }, context);
  assert(!ghostRes.ok, 'Ghost/deceased transfer must be rejected');
  assert(ghostRes.error.code === 'CAT_NOT_IN_HOUSEHOLD', 'Error code CAT_NOT_IN_HOUSEHOLD');

  // 7d. Cat not in household rejected
  const nonMemberRes = reduceNeighborhood(state, {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'unknown_cat_id', targetLotId: 'npc_home_1' },
  }, context);
  assert(!nonMemberRes.ok, 'Non-member cat transfer rejected');
  assert(nonMemberRes.error.code === 'CAT_NOT_IN_HOUSEHOLD', 'Error code CAT_NOT_IN_HOUSEHOLD');

  // 7e. Double ID collision: catId already in neighborhood.npcCats
  state.cats['npc_cat_barnaby'] = {
    ...state.cats['cat_player_1'],
    id: 'npc_cat_barnaby',
    name: 'Barnaby Duplicate',
    lifeStage: 'adult',
  };
  state.livingCatIds.push('npc_cat_barnaby');
  const dupRes = reduceNeighborhood(state, {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'npc_cat_barnaby', targetLotId: 'npc_home_1' },
  }, context);
  assert(!dupRes.ok, 'Double ID transfer collision must be rejected');
  assert(dupRes.error.code === 'DUPLICATE_CAT_ID', `Expected DUPLICATE_CAT_ID, got ${dupRes.error.code}`);

  // 7f. Destination lot invalid (non-existent)
  const invalidLotRes = reduceNeighborhood(state, {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_player_1', targetLotId: 'non_existent_lot' },
  }, context);
  assert(!invalidLotRes.ok, 'Non-existent lot rejected');
  assert(invalidLotRes.error.code === 'INVALID_TRANSFER_DESTINATION', 'Error code INVALID_TRANSFER_DESTINATION');

  // 7g. Destination lot invalid (not an npc_home: e.g. park or shop)
  const parkDestRes = reduceNeighborhood(state, {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_player_1', targetLotId: 'park' },
  }, context);
  assert(!parkDestRes.ok, 'Park destination rejected');
  assert(parkDestRes.error.code === 'INVALID_TRANSFER_DESTINATION', 'Error code INVALID_TRANSFER_DESTINATION');

  // 7h. Destination lot invalid (current home lot)
  const homeDestRes = reduceNeighborhood(state, {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_player_1', targetLotId: 'lot_home' },
  }, context);
  assert(!homeDestRes.ok, 'Transfer to home lot rejected');
  assert(homeDestRes.error.code === 'INVALID_TRANSFER_DESTINATION', 'Error code INVALID_TRANSFER_DESTINATION');

  console.log('  -> PASS: Kittens, adolescents, ghosts, double IDs, and invalid destinations strictly rejected.\n');
})();

// Test 8: Full Preservation of Ancestry, Relationships & Career Appearance
(() => {
  console.log('Test 8: Adult Transfer with Full Preservation of Ancestry, Relationships & Career');
  let state = createTestWorldState();
  const adultCat = state.cats['cat_player_1'];
  adultCat.lifeStage = 'adult';
  adultCat.appearance = {
    breed: 'calico',
    primaryColor: '#F39C12',
    secondaryColor: '#FFFFFF',
    pattern: 'calico',
    eyeColor: 'green',
    bodyType: 'petite',
    collarColor: '#9B59B6',
    accessoryId: 'bell_silver',
  };
  adultCat.baseAppearance = { ...adultCat.appearance };
  adultCat.careerOutfit = {
    outfitId: 'cafe_apron',
    careerId: 'cafe_assistant',
    rank: 2,
  };
  adultCat.motherId = 'cat_mama';
  adultCat.fatherId = 'cat_papa';
  adultCat.familyTree = {
    motherId: 'cat_mama',
    fatherId: 'cat_papa',
    partnerId: 'cat_partner',
    offspringIds: ['cat_kitten_1'],
  };
  adultCat.relationships = {
    cat_friend: { friendship: 85, romance: 20, isLove: false },
    cat_partner: { friendship: 95, romance: 90, isLove: true },
  };

  const transferCmd: NeighborhoodCommand = {
    type: 'TRANSFER_CAT_TO_NEIGHBORHOOD',
    payload: { catId: 'cat_player_1', targetLotId: 'npc_home_2' },
  };

  const res = reduceNeighborhood(state, transferCmd, context);
  assert(res.ok, 'Eligible adult transfer should succeed');
  state = res.state;

  // Verify removed from living household
  assert(!state.livingCatIds.includes('cat_player_1'), 'Removed from livingCatIds');
  assert(state.cats['cat_player_1'] === undefined, 'Removed from household cats record');

  // Verify converted to NPC with all data intact
  const npc = state.neighborhood.npcCats['cat_player_1'];
  assert(npc !== undefined, 'Present in npcCats');
  assert(npc.isNpc === true, 'Marked as NPC');
  assert(npc.homeLotId === 'npc_home_2', 'Home lot set to Whiskers Manor (npc_home_2)');
  assert(npc.position.lotId === 'npc_home_2', 'Position set to Whiskers Manor');

  // Appearance & career preserved
  assert(npc.appearance.primaryColor === '#F39C12', 'Primary color preserved');
  assert(npc.appearance.accessoryId === 'bell_silver', 'Accessory preserved');
  assert(npc.baseAppearance?.breed === 'calico', 'Base appearance preserved');
  assert(npc.careerOutfit?.outfitId === 'cafe_apron', 'Career outfit preserved');
  assert(npc.careerOutfit?.rank === 2, 'Career rank preserved');

  // Ancestry & relationships preserved
  assert(npc.motherId === 'cat_mama', 'Mother ID preserved');
  assert(npc.fatherId === 'cat_papa', 'Father ID preserved');
  assert(npc.familyTree?.partnerId === 'cat_partner', 'Family tree partner preserved');
  assert(npc.relationships['cat_partner']?.isLove === true, 'Relationship preserved');

  // Target lot updated
  const manor = state.neighborhood.lots['npc_home_2'];
  assert(manor.residentCatIds?.includes('cat_player_1'), 'Resident added to target lot');

  // Transfer history logged
  const history = state.neighborhood.transferredCats['cat_player_1'];
  assert(history !== undefined, 'Transfer history logged');
  assert(history.newHomeLotId === 'npc_home_2', 'History has correct destination');

  console.log('  -> PASS: Ancestry, family tree, relationships, and career outfit fully preserved on transfer.\n');
})();

// Test 9: Exact-Once Adoption Fee & Empty Household Recovery
(() => {
  console.log('Test 9: Exact-Once Adoption Fee & Empty Household Recovery');
  let state = createTestWorldState({
    livingCatIds: [], // Household empty after last cat died
    cats: {},
    economy: {
      wallet: { earnedCash: 300, freeBuildCash: 0, mode: 'normal' },
      inventory: {},
      careers: {},
      cafe: { owned: true, recipes: [], supplies: {}, dailyRevenue: 0 },
      goals: {},
    },
    lifecycle: {
      pregnancies: {},
      memorials: {
        mem_beloved: {
          memorialId: 'mem_beloved',
          catId: 'cat_beloved',
          name: 'Beloved Old Cat',
          appearance: { primaryColor: '#555', eyeColor: 'green' },
          traits: ['lazy'],
          ageAtDeathMinutes: 150 * 1440,
          causeOfDeath: 'old_age',
          deceasedAtSimMinute: 1000,
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
      candidateId: 'candidate_pip',
      name: 'Pip',
      appearance: { primaryColor: '#F1C40F', eyeColor: 'blue' },
      traits: ['playful', 'adventurous'],
    },
  };

  const res = reduceNeighborhood(state, adoptCmd, context);
  assert(res.ok, 'Recovery adoption into empty household should succeed');
  state = res.state;

  assert(state.livingCatIds.length === 1, '1 living cat in household');
  assert(state.economy.wallet.earnedCash === 300 - 50, 'Fee deducted exactly once ($250)');
  assert(state.lifecycle.memorials['mem_beloved'] !== undefined, 'Memorial of deceased cat preserved');

  // Candidate removed so cannot be adopted again
  assert(state.neighborhood.adoptionCandidates.find(c => c.candidateId === 'candidate_pip') === undefined, 'Candidate removed');

  // Double adoption of same candidate fails
  const doubleAdoptRes = reduceNeighborhood(state, adoptCmd, context);
  assert(!doubleAdoptRes.ok, 'Double adoption of same candidate must fail');
  assert(doubleAdoptRes.error.code === 'CANDIDATE_NOT_FOUND', 'Error CANDIDATE_NOT_FOUND');
  assert(doubleAdoptRes.state.economy.wallet.earnedCash === 250, 'Wallet unchanged on failed second adoption');

  console.log('  -> PASS: Empty household restored; fee deducted once; candidate removed preventing double adoption.\n');
})();

// Test 10: Seven Persistent Lots, Eight NPCs, and Clock Advance Non-Mutation
(() => {
  console.log('Test 10: Seven Persistent Lots, Eight Persistent NPCs & Clock Non-Mutation');
  let state = createTestWorldState();

  // Verify all 7 lots exist
  const lotKeys = Object.keys(state.neighborhood.lots);
  assert(lotKeys.length === 7, `Expected 7 lots, got ${lotKeys.length}`);
  assert(state.neighborhood.lots['lot_home'] !== undefined, 'lot_home present');
  assert(state.neighborhood.lots['npc_home_1'] !== undefined, 'npc_home_1 present');
  assert(state.neighborhood.lots['npc_home_2'] !== undefined, 'npc_home_2 present');
  assert(state.neighborhood.lots['npc_home_3'] !== undefined, 'npc_home_3 present');
  assert(state.neighborhood.lots['park'] !== undefined, 'park present');
  assert(state.neighborhood.lots['shop'] !== undefined, 'shop present');
  assert(state.neighborhood.lots['cafe'] !== undefined, 'cafe present');

  // Verify all 8 persistent NPCs exist
  const npcKeys = Object.keys(state.neighborhood.npcCats);
  assert(npcKeys.length === 8, `Expected 8 persistent NPCs, got ${npcKeys.length}`);
  const expectedNpcNames = ['Barnaby', 'Cleo', 'Felix', 'Milo', 'Hazel', 'Luna', 'Oliver', 'Shadow'];
  for (const name of expectedNpcNames) {
    assert(Object.values(state.neighborhood.npcCats).some(n => n.name === name), `NPC ${name} must be present`);
  }

  // Advance simulation: clock must NOT be mutated by advanceNeighborhood (engine invariant)
  const initialSimMinute = state.clock.simMinute;
  state = advanceNeighborhood(state, 30);
  assert(state.clock.simMinute === initialSimMinute, `advanceNeighborhood must not mutate state.clock.simMinute (was ${initialSimMinute}, now ${state.clock.simMinute})`);

  console.log('  -> PASS: 7 lots, 8 NPCs, and central engine clock invariant strictly preserved.\n');
})();

// Test 11: Save/Resume Round-Trip Serialization
(() => {
  console.log('Test 11: Save/Resume Round-Trip JSON Serialization');
  let state = createTestWorldState();

  // Start travel and transfer a cat to make neighborhood state rich
  state = reduceNeighborhood(state, { type: 'TRAVEL_TO_LOT', payload: { catId: 'cat_player_1', targetLotId: 'park' } }, context).state;

  const jsonString = JSON.stringify(state);
  const reloadedState = JSON.parse(jsonString);

  assert(reloadedState.neighborhood.lots['park'] !== undefined, 'Lots preserved across serialization');
  assert(reloadedState.neighborhood.activeTravels['cat_player_1'] !== undefined, 'Active travel preserved across serialization');
  assert(reloadedState.neighborhood.shopInventory.length === 5, 'Shop catalog preserved across serialization');
  assert(reloadedState.neighborhood.adoptionCandidates.length === 3, 'Adoption candidates preserved across serialization');

  console.log('  -> PASS: Neighborhood state survives round-trip JSON serialization.\n');
})();

console.log('=== All 11 Comprehensive Neighborhood Verification Test Suites Passed! ===\n');
