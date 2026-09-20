/**
 * Starter World and Content Topology Factory
 */

import { SeededRng } from '../rng';
import {
  BuildingSubsystemState,
  CatRecord,
  DoorItem,
  EconomySubsystemState,
  GoalRecord,
  LifecycleSubsystemState,
  LotObject,
  NeighborhoodSubsystemState,
  SocialSubsystemState,
  WallSegment,
  WorldLot,
  WorldState,
} from '../state';
import { createCatRecord } from './cat';

export function createStarterWorld(options?: {
  householdId?: string;
  householdName?: string;
  ownerId?: string;
  seed?: number;
  starterCatName?: string;
}): WorldState {
  const householdId = options?.householdId || 'hh_default_01';
  const householdName = options?.householdName || 'My Cats';
  const ownerId = options?.ownerId || 'usr_gift_recipient';
  const seed = options?.seed ?? 1337;
  const rng = new SeededRng(seed);

  // 1. Create Home Lot
  const homeWalls: WallSegment[] = [
    { id: 'w_north', x1: 0, y1: 0, x2: 11, y2: 0, provenance: 'earned' },
    { id: 'w_south', x1: 0, y1: 9, x2: 11, y2: 9, provenance: 'earned' },
    { id: 'w_west', x1: 0, y1: 0, x2: 0, y2: 9, provenance: 'earned' },
    { id: 'w_east', x1: 11, y1: 0, x2: 11, y2: 9, provenance: 'earned' },
    { id: 'w_inner', x1: 5, y1: 0, x2: 5, y2: 5, provenance: 'earned' },
  ];

  const homeDoors: DoorItem[] = [
    { id: 'd_inner', x: 5, y: 3, orientation: 'vertical', provenance: 'earned' },
    { id: 'd_front', x: 6, y: 9, orientation: 'horizontal', provenance: 'earned' },
  ];

  const homeObjects: LotObject[] = [
    {
      id: 'obj_bed_01',
      catalogId: 'furn_cushion_cozy',
      name: 'Deluxe Cozy Cushion',
      category: 'sleep',
      x: 2,
      y: 2,
      width: 1,
      height: 1,
      interactSpots: [{ x: 2, y: 3 }],
      provenance: 'earned',
    },
    {
      id: 'obj_bowl_01',
      catalogId: 'furn_bowl_ceramic',
      name: 'Pastel Ceramic Food Bowl',
      category: 'care',
      x: 6,
      y: 2,
      width: 1,
      height: 1,
      interactSpots: [{ x: 6, y: 3 }],
      provenance: 'earned',
    },
    {
      id: 'obj_litter_01',
      catalogId: 'furn_litter_basic',
      name: 'Clean Litter Box',
      category: 'care',
      x: 8,
      y: 7,
      width: 1,
      height: 1,
      interactSpots: [{ x: 8, y: 6 }],
      provenance: 'earned',
    },
    {
      id: 'obj_scratcher_01',
      catalogId: 'furn_scratcher_sisal',
      name: 'Sisal Scratching Post',
      category: 'play',
      x: 3,
      y: 5,
      width: 1,
      height: 1,
      interactSpots: [{ x: 3, y: 6 }],
      provenance: 'earned',
    },
    {
      id: 'obj_tree_01',
      catalogId: 'furn_tree_multitier',
      name: 'Multi-Tier Cat Tree',
      category: 'play',
      x: 9,
      y: 2,
      width: 1,
      height: 1,
      interactSpots: [{ x: 9, y: 3 }],
      provenance: 'earned',
    },
  ];

  // Blocked cells (boundary walls, inner wall, objects, minus doors)
  const blockedSet = new Set<string>();
  for (let x = 0; x <= 11; x++) {
    blockedSet.add(`${x},0`);
    blockedSet.add(`${x},9`);
  }
  for (let y = 0; y <= 9; y++) {
    blockedSet.add(`0,${y}`);
    blockedSet.add(`11,${y}`);
  }
  for (let y = 0; y <= 5; y++) {
    blockedSet.add(`5,${y}`);
  }
  // Remove doors from blocked set
  for (const door of homeDoors) {
    blockedSet.delete(`${door.x},${door.y}`);
  }
  // Add objects to blocked set
  for (const obj of homeObjects) {
    blockedSet.add(`${obj.x},${obj.y}`);
  }

  const homeLot: WorldLot = {
    id: 'home',
    type: 'home',
    name: 'Player Home',
    width: 12,
    height: 10,
    blockedCells: Array.from(blockedSet),
    walls: homeWalls,
    doors: homeDoors,
    objects: homeObjects,
  };

  // Neighborhood lots
  const npchome1: WorldLot = {
    id: 'npc_home_1',
    type: 'npc_home',
    name: 'Whisker Cottage',
    width: 10,
    height: 8,
    blockedCells: [],
    walls: [],
    doors: [],
    objects: [],
  };

  const parkLot: WorldLot = {
    id: 'park',
    type: 'park',
    name: 'Sunlit Catnip Park',
    width: 16,
    height: 14,
    blockedCells: [],
    walls: [],
    doors: [],
    objects: [],
  };

  const shopLot: WorldLot = {
    id: 'shop',
    type: 'shop',
    name: 'Paws & Goods Corner Store',
    width: 12,
    height: 10,
    blockedCells: [],
    walls: [],
    doors: [],
    objects: [],
  };

  const cafeLot: WorldLot = {
    id: 'cafe',
    type: 'cafe',
    name: 'The Whiskered Bean Café',
    width: 14,
    height: 12,
    blockedCells: [],
    walls: [],
    doors: [],
    objects: [],
  };

  const buildingState: BuildingSubsystemState = {
    lots: {
      home: homeLot,
      npc_home_1: npchome1,
      park: parkLot,
      shop: shopLot,
      cafe: cafeLot,
    },
    activeFreeBuild: false,
  };

  // 2. Starter Cat: Mochi
  const starterCat: CatRecord = createCatRecord({
    id: 'cat_mochi',
    householdId,
    name: options?.starterCatName || 'Mochi',
    appearance: {
      breed: 'calico',
      primaryColor: '#FFFFFF',
      secondaryColor: '#E07A5F',
      pattern: 'calico',
      eyeColor: 'amber',
      bodyType: 'average',
      collarColor: '#E76F51',
    },
    traits: ['playful', 'curious', 'affectionate'],
    lifeStage: 'adult',
    position: {
      lotId: 'home',
      x: 4,
      y: 4,
      facing: 'south',
    },
    createdAtSimMinute: 0,
  });

  // 3. Economy & Goals
  const initialGoals: Record<string, GoalRecord> = {
    g_first_meal: {
      id: 'g_first_meal',
      title: 'Serve First Meal',
      category: 'care',
      completed: false,
      progress: 0,
      target: 1,
      rewardCash: 50,
    },
    g_cozy_nap: {
      id: 'g_cozy_nap',
      title: 'Cozy Afternoon Nap',
      category: 'care',
      completed: false,
      progress: 0,
      target: 1,
      rewardCash: 50,
    },
    g_make_friend: {
      id: 'g_make_friend',
      title: 'Make a Feline Friend',
      category: 'relationships',
      completed: false,
      progress: 0,
      target: 1,
      rewardCash: 100,
    },
    g_first_expansion: {
      id: 'g_first_expansion',
      title: 'Build a Room Wall',
      category: 'building',
      completed: false,
      progress: 0,
      target: 1,
      rewardCash: 150,
    },
    g_first_promotion: {
      id: 'g_first_promotion',
      title: 'Earn First Career Promotion',
      category: 'work',
      completed: false,
      progress: 0,
      target: 1,
      rewardCash: 200,
    },
    g_grow_catnip: {
      id: 'g_grow_catnip',
      title: 'Harvest First Catnip Crop',
      category: 'hobbies',
      completed: false,
      progress: 0,
      target: 1,
      rewardCash: 75,
    },
    g_cafe_open: {
      id: 'g_cafe_open',
      title: 'Open The Whiskered Bean Café',
      category: 'business',
      completed: false,
      progress: 0,
      target: 1,
      rewardCash: 300,
    },
    g_park_trip: {
      id: 'g_park_trip',
      title: 'Visit Sunlit Catnip Park',
      category: 'neighborhood',
      completed: false,
      progress: 0,
      target: 1,
      rewardCash: 50,
    },
  };

  const economyState: EconomySubsystemState = {
    wallet: {
      earnedCash: 500,
      freeBuildCash: 0,
      mode: 'normal',
    },
    inventory: {},
    careers: {},
    cafe: {
      owned: false,
      recipes: [
        { id: 'rec_fish_pie', name: 'Fish Pie', cost: 10, price: 25, unlocked: true },
        { id: 'rec_cream_bun', name: 'Cream Bun', cost: 8, price: 20, unlocked: true },
        { id: 'rec_catnip_tea', name: 'Catnip Tea', cost: 5, price: 15, unlocked: true },
      ],
      supplies: { fish: 10, flour: 10, catnip: 10 },
      dailyRevenue: 0,
    },
    goals: initialGoals,
  };

  const socialState: SocialSubsystemState = {
    recentInteractions: [],
  };

  const neighborhoodState: NeighborhoodSubsystemState = {
    activeLotId: 'home',
    npcCats: {},
  };

  const lifecycleState: LifecycleSubsystemState = {
    pregnancies: {},
    memorials: {},
    ghosts: [],
  };

  const rngSnapshot = rng.snapshot();

  return {
    schemaVersion: 1,
    catalogVersion: 1,
    householdId,
    householdName,
    ownerId,
    revision: 1,
    clock: {
      simMinute: 480, // Day 1, 8:00 AM
      isPaused: true,
      speed: 1,
    },
    rng: {
      seed: rngSnapshot.seed,
      counter: rngSnapshot.drawCount,
      serializedState: rng.serialize(),
    },
    selectedCatId: starterCat.id,
    livingCatIds: [starterCat.id],
    cats: {
      [starterCat.id]: starterCat,
    },
    building: buildingState,
    social: socialState,
    economy: economyState,
    neighborhood: neighborhoodState,
    lifecycle: lifecycleState,
    commandReceipts: [],
    events: [],
    nextEventSequence: 1,
  };
}
