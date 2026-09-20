// src/domain/economy/reducer.ts

import { CAREER_CONFIGS, CROP_CONFIGS, CAFE_RECIPES, GOAL_DEFINITIONS } from './constants';
import {
  EconomyCommand,
  EconomyExtensionState,
  CareerId,
  CropType,
  EaselState,
  Artwork,
  GardenPlotState,
  CatWorkState,
  CAREER_OUTFITS
} from './types';

// Generic shapes based on shared engine contract
export interface CommandContext {
  actorId: string;
  commandId: string;
  timestamp?: number;
}

export interface DomainEvent {
  id: string;
  type: string;
  sequence: number;
  simTime: number;
  actorIds: string[];
  payload: Record<string, unknown>;
}

export interface CommandResult {
  ok: boolean;
  state: any; // WorldState
  events?: DomainEvent[];
  error?: { code: string; message: string };
}

export function initializeEconomyState(initialEarnedCash = 500) {
  const initialGoals: Record<string, any> = {};
  for (const def of GOAL_DEFINITIONS) {
    initialGoals[def.id] = {
      id: def.id,
      title: def.title,
      category: def.category,
      completed: false,
      progress: 0,
      target: def.target,
      rewardCash: def.rewardCash
    };
  }

  const initialRecipes = CAFE_RECIPES.map((r) => ({
    id: r.id,
    name: r.name,
    cost: r.costToStock,
    price: r.sellPrice,
    unlocked: r.unlocked
  }));

  const initialSupplies: Record<string, number> = {};
  for (const r of CAFE_RECIPES) {
    initialSupplies[r.id] = 0;
  }

  const extensions: EconomyExtensionState = {
    workStates: {},
    easels: {},
    artworks: {},
    gardenPlots: {},
    cafeDetails: {
      owned: false,
      purchaseCost: 500,
      isOpen: false,
      reputation: 10,
      totalRevenue: 0,
      totalExpenses: 0,
      activeOrders: [],
      customerQueue: [],
      lastOrderCheckSimMinute: 0
    },
    claimedGoalRewards: {}
  };

  return {
    wallet: {
      earnedCash: initialEarnedCash,
      freeBuildCash: 0,
      mode: 'normal' as const
    },
    inventory: {} as Record<string, any>,
    careers: {} as Record<string, any>,
    cafe: {
      owned: false,
      recipes: initialRecipes,
      supplies: initialSupplies,
      dailyRevenue: 0
    },
    goals: initialGoals,
    extensions
  };
}

export function isEconomyCommand(command: { type: string }): boolean {
  const economyTypes = [
    'JOIN_CAREER',
    'LEAVE_CAREER',
    'START_WORK_SHIFT',
    'FINISH_WORK_SHIFT',
    'CANCEL_WORK_SHIFT',
    'START_PAINTING',
    'PROGRESS_PAINTING',
    'FINISH_PAINTING',
    'DISPLAY_ARTWORK',
    'SELL_ARTWORK',
    'PLANT_CROP',
    'WATER_CROP',
    'HARVEST_CROP',
    'SELL_ITEM',
    'BUY_ITEM',
    'BUY_CAFE_BUSINESS',
    'SET_CAFE_OPEN',
    'RESTOCK_CAFE',
    'SERVE_CAFE_CUSTOMER',
    'CLAIM_GOAL_REWARD'
  ];
  return economyTypes.includes(command.type);
}

export function reduceEconomy(
  worldState: any,
  command: EconomyCommand | { type: string; payload?: any },
  context: CommandContext
): CommandResult {
  if (!isEconomyCommand(command)) {
    return { ok: true, state: worldState, events: [] };
  }

  // Clone immutable root state
  const state = JSON.parse(JSON.stringify(worldState));
  if (!state.economy) {
    state.economy = initializeEconomyState();
  }
  if (!state.economy.extensions) {
    state.economy.extensions = {
      workStates: {},
      easels: {},
      artworks: {},
      gardenPlots: {},
      cafeDetails: {
        owned: false,
        purchaseCost: 500,
        isOpen: false,
        reputation: 10,
        totalRevenue: 0,
        totalExpenses: 0,
        activeOrders: [],
        customerQueue: [],
        lastOrderCheckSimMinute: 0
      },
      claimedGoalRewards: {}
    };
  }

  const events: DomainEvent[] = [];
  const simMinute = state.clock?.simMinute || 0;
  let seq = state.nextEventSequence || 1;

  const createEvent = (type: string, payload: Record<string, unknown>, actorIds: string[] = []) => {
    const event: DomainEvent = {
      id: `evt_${seq}_${simMinute}`,
      type,
      sequence: seq++,
      simTime: simMinute,
      actorIds,
      payload
    };
    events.push(event);
    if (!state.events) state.events = [];
    state.events.push(event);
  };

  const currentMode = state.wallet?.mode || state.economy?.wallet?.mode;
  const isFreeBuild = currentMode && currentMode !== 'normal';

  switch (command.type) {
    case 'JOIN_CAREER': {
      const { catId, careerId } = command.payload;
      const config = CAREER_CONFIGS[careerId as CareerId];
      if (!config) {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAREER', message: 'Unknown career' } };
      }

      // Check cat exists and is alive
      const cat = state.cats?.[catId];
      if (!cat || cat.lifeStatus === 'deceased') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAT', message: 'Cat not found or deceased' } };
      }

      // Reset any active work state
      state.economy.careers[catId] = {
        catId,
        careerId,
        rank: 1,
        shiftStartHour: config.ranks[0].shiftStartHour,
        shiftEndHour: config.ranks[0].shiftEndHour,
        workDays: config.ranks[0].workDays,
        performance: 50
      };

      state.economy.extensions.workStates[catId] = {
        catId,
        careerId,
        status: 'off_work',
        shiftStartSimMinute: 0,
        shiftEndSimMinute: 0,
        currentOutfitId: null, // restore normal
        lastPaidSimMinute: 0,
        daysWorked: 0,
        missedShifts: 0
      };

      createEvent('CAREER_JOINED', { catId, careerId, rank: 1 }, [catId]);
      break;
    }

    case 'LEAVE_CAREER': {
      const { catId } = command.payload;
      if (state.economy.careers[catId]) {
        delete state.economy.careers[catId];
      }
      if (state.economy.extensions.workStates[catId]) {
        delete state.economy.extensions.workStates[catId];
      }
      createEvent('CAREER_LEFT', { catId }, [catId]);
      break;
    }

    case 'START_WORK_SHIFT': {
      const { catId } = command.payload;
      const career = state.economy.careers[catId];
      if (!career) {
        return { ok: false, state: worldState, error: { code: 'NO_CAREER', message: 'Cat has no career' } };
      }

      const cat = state.cats?.[catId];
      if (!cat || cat.lifeStatus === 'deceased') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAT', message: 'Cat is deceased' } };
      }

      const outfitDef = CAREER_OUTFITS[career.careerId as CareerId];
      const workState: CatWorkState = state.economy.extensions.workStates[catId] || {
        catId,
        careerId: career.careerId,
        status: 'off_work',
        shiftStartSimMinute: 0,
        shiftEndSimMinute: 0,
        currentOutfitId: null,
        lastPaidSimMinute: 0,
        daysWorked: 0,
        missedShifts: 0
      };

      workState.status = 'working';
      workState.shiftStartSimMinute = simMinute;
      workState.shiftEndSimMinute = simMinute + (career.shiftEndHour - career.shiftStartHour) * 60;
      workState.currentOutfitId = outfitDef.id; // saved work-state outfit visibility
      state.economy.extensions.workStates[catId] = workState;

      createEvent('WORK_SHIFT_STARTED', { catId, careerId: career.careerId, outfitId: outfitDef.id }, [catId]);
      break;
    }

    case 'FINISH_WORK_SHIFT': {
      const { catId } = command.payload;
      const career = state.economy.careers[catId];
      const workState: CatWorkState = state.economy.extensions.workStates[catId];

      if (!career || !workState || workState.status !== 'working') {
        return { ok: false, state: worldState, error: { code: 'NOT_WORKING', message: 'Cat is not currently working' } };
      }

      const hoursWorked = Math.max(1, Math.floor((simMinute - workState.shiftStartSimMinute) / 60));
      const rankConfig = CAREER_CONFIGS[career.careerId as CareerId].ranks.find((r) => r.rank === career.rank);
      const wagePerHour = rankConfig ? rankConfig.hourlyWage : 10;
      const totalWage = hoursWorked * wagePerHour;

      // Ensure single settlement, positive cash addition
      if (!isFreeBuild) {
        state.economy.wallet.earnedCash = Math.max(0, Math.floor(state.economy.wallet.earnedCash + totalWage));
      }

      workState.status = 'off_work';
      workState.currentOutfitId = null; // restore ordinary appearance
      workState.daysWorked += 1;
      workState.lastPaidSimMinute = simMinute;

      createEvent('WORK_SHIFT_FINISHED', { catId, hoursWorked, wageEarned: isFreeBuild ? 0 : totalWage }, [catId]);
      break;
    }

    case 'CANCEL_WORK_SHIFT': {
      const { catId } = command.payload;
      const workState: CatWorkState = state.economy.extensions.workStates[catId];
      if (workState) {
        workState.status = 'off_work';
        workState.currentOutfitId = null; // restore ordinary appearance
      }
      createEvent('WORK_SHIFT_CANCELLED', { catId }, [catId]);
      break;
    }

    case 'START_PAINTING': {
      const { catId, easelObjectId } = command.payload;
      let easel: EaselState = state.economy.extensions.easels[easelObjectId];
      if (!easel) {
        easel = {
          easelObjectId,
          currentCatId: catId,
          progressMinutes: 0,
          targetMinutes: 60,
          artworkTitle: 'Untitled Masterpiece'
        };
      } else {
        easel.currentCatId = catId;
      }
      state.economy.extensions.easels[easelObjectId] = easel;
      createEvent('PAINTING_STARTED', { catId, easelObjectId }, [catId]);
      break;
    }

    case 'PROGRESS_PAINTING': {
      const { catId, easelObjectId, elapsedMinutes } = command.payload;
      const easel: EaselState = state.economy.extensions.easels[easelObjectId];
      if (!easel || easel.currentCatId !== catId) {
        return { ok: false, state: worldState, error: { code: 'INVALID_EASEL', message: 'Easel not actively in use by cat' } };
      }

      easel.progressMinutes = Math.min(easel.targetMinutes, easel.progressMinutes + elapsedMinutes);
      createEvent('PAINTING_PROGRESS', { catId, easelObjectId, progressMinutes: easel.progressMinutes }, [catId]);
      break;
    }

    case 'FINISH_PAINTING': {
      const { catId, easelObjectId } = command.payload;
      const easel: EaselState = state.economy.extensions.easels[easelObjectId];
      if (!easel || easel.progressMinutes < easel.targetMinutes) {
        return { ok: false, state: worldState, error: { code: 'INCOMPLETE_PAINTING', message: 'Painting not yet complete' } };
      }

      const cat = state.cats?.[catId];
      const skillLevel = cat?.skills?.painting || 1;
      const seedVal = (state.rng?.counter || 1) % 100;

      let quality: 'basic' | 'fine' | 'masterpiece' = 'basic';
      let value = 30 + skillLevel * 10;

      if (skillLevel >= 5 && seedVal > 70) {
        quality = 'masterpiece';
        value = 150 + skillLevel * 20;
      } else if (skillLevel >= 2 && seedVal > 40) {
        quality = 'fine';
        value = 75 + skillLevel * 15;
      }

      const artworkId = `art_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const artwork: Artwork = {
        id: artworkId,
        artistCatId: catId,
        title: easel.artworkTitle || 'Untitled Painting',
        quality,
        value,
        createdAtSimMinute: simMinute,
        provenance: isFreeBuild ? 'free_build' : 'earned',
        isDisplayed: false
      };

      state.economy.extensions.artworks[artworkId] = artwork;
      delete state.economy.extensions.easels[easelObjectId]; // clear easel WIP

      createEvent('PAINTING_FINISHED', { catId, artworkId, quality, value }, [catId]);
      break;
    }

    case 'SELL_ARTWORK': {
      const { artworkId } = command.payload;
      const artwork: Artwork = state.economy.extensions.artworks[artworkId];
      if (!artwork) {
        return { ok: false, state: worldState, error: { code: 'ARTWORK_NOT_FOUND', message: 'Artwork does not exist' } };
      }

      // Exactly once settlement & provenance validation
      if (artwork.provenance === 'earned' && !isFreeBuild) {
        state.economy.wallet.earnedCash = Math.floor(state.economy.wallet.earnedCash + artwork.value);
      }

      delete state.economy.extensions.artworks[artworkId];
      createEvent('ARTWORK_SOLD', { artworkId, value: artwork.provenance === 'earned' ? artwork.value : 0 });
      break;
    }

    case 'PLANT_CROP': {
      const { plotObjectId, cropType } = command.payload;
      const cropConfig = CROP_CONFIGS[cropType as CropType];
      if (!cropConfig) {
        return { ok: false, state: worldState, error: { code: 'INVALID_CROP', message: 'Crop type invalid' } };
      }

      if (!isFreeBuild) {
        if (state.economy.wallet.earnedCash < cropConfig.seedCost) {
          return { ok: false, state: worldState, error: { code: 'INSUFFICIENT_FUNDS', message: 'Cannot afford seeds' } };
        }
        state.economy.wallet.earnedCash = Math.floor(state.economy.wallet.earnedCash - cropConfig.seedCost);
      } else {
        state.economy.wallet.freeBuildCash = Math.floor((state.economy.wallet.freeBuildCash || 10000) - cropConfig.seedCost);
      }

      const plot: GardenPlotState = {
        plotObjectId,
        cropType,
        plantedAtSimMinute: simMinute,
        lastWateredSimMinute: simMinute,
        growthProgressMinutes: 0,
        isWithered: false,
        isHarvestable: false,
        provenance: isFreeBuild ? 'free_build' : 'earned'
      };

      state.economy.extensions.gardenPlots[plotObjectId] = plot;
      createEvent('CROP_PLANTED', { plotObjectId, cropType });
      break;
    }

    case 'WATER_CROP': {
      const { plotObjectId } = command.payload;
      const plot: GardenPlotState = state.economy.extensions.gardenPlots[plotObjectId];
      if (!plot || !plot.cropType) {
        return { ok: false, state: worldState, error: { code: 'NO_CROP', message: 'No crop planted in plot' } };
      }

      plot.lastWateredSimMinute = simMinute;
      plot.isWithered = false;
      createEvent('CROP_WATERED', { plotObjectId });
      break;
    }

    case 'HARVEST_CROP': {
      const { plotObjectId } = command.payload;
      const plot: GardenPlotState = state.economy.extensions.gardenPlots[plotObjectId];
      if (!plot || !plot.cropType || !plot.isHarvestable) {
        return { ok: false, state: worldState, error: { code: 'NOT_HARVESTABLE', message: 'Crop not harvestable' } };
      }

      const cropConfig = CROP_CONFIGS[plot.cropType];
      const yieldQty = cropConfig.baseYield;
      const catalogId = `item_crop_${plot.cropType}`;

      const invItem = state.economy.inventory[catalogId] || {
        id: catalogId,
        catalogId,
        quantity: 0,
        provenance: plot.provenance
      };

      invItem.quantity += yieldQty;
      state.economy.inventory[catalogId] = invItem;

      // Clear plot after harvest
      delete state.economy.extensions.gardenPlots[plotObjectId];

      createEvent('CROP_HARVESTED', { plotObjectId, cropType: plot.cropType, yieldQuantity: yieldQty });
      break;
    }

    case 'SELL_ITEM': {
      const { itemId, quantity } = command.payload;
      const item = state.economy.inventory[itemId];
      if (!item || item.quantity < quantity || quantity <= 0) {
        return { ok: false, state: worldState, error: { code: 'INVALID_ITEM_QUANTITY', message: 'Item not available or insufficient quantity' } };
      }

      // Calculate price
      let unitPrice = 10;
      if (itemId.includes('tomato')) unitPrice = CROP_CONFIGS.tomato.baseSellPrice;
      if (itemId.includes('strawberry')) unitPrice = CROP_CONFIGS.strawberry.baseSellPrice;
      if (itemId.includes('catnip')) unitPrice = CROP_CONFIGS.catnip.baseSellPrice;

      const totalPrice = unitPrice * quantity;

      item.quantity -= quantity;
      if (item.quantity <= 0) {
        delete state.economy.inventory[itemId];
      }

      if (item.provenance === 'earned' && !isFreeBuild) {
        state.economy.wallet.earnedCash = Math.floor(state.economy.wallet.earnedCash + totalPrice);
      }

      createEvent('ITEM_SOLD', { itemId, quantity, totalPrice: item.provenance === 'earned' ? totalPrice : 0 });
      break;
    }

    case 'BUY_ITEM': {
      const { catalogId, quantity } = command.payload;
      if (quantity <= 0) {
        return { ok: false, state: worldState, error: { code: 'INVALID_QUANTITY', message: 'Quantity must be positive' } };
      }

      const itemCost = 25 * quantity;
      if (!isFreeBuild) {
        if (state.economy.wallet.earnedCash < itemCost) {
          return { ok: false, state: worldState, error: { code: 'INSUFFICIENT_FUNDS', message: 'Cannot afford item' } };
        }
        state.economy.wallet.earnedCash = Math.floor(state.economy.wallet.earnedCash - itemCost);
      }

      const invItem = state.economy.inventory[catalogId] || {
        id: catalogId,
        catalogId,
        quantity: 0,
        provenance: isFreeBuild ? 'free_build' : 'earned'
      };

      invItem.quantity += quantity;
      state.economy.inventory[catalogId] = invItem;

      createEvent('ITEM_BOUGHT', { catalogId, quantity, totalCost: isFreeBuild ? 0 : itemCost });
      break;
    }

    case 'BUY_CAFE_BUSINESS': {
      const cost = state.economy.extensions.cafeDetails.purchaseCost;
      if (state.economy.cafe.owned) {
        return { ok: false, state: worldState, error: { code: 'ALREADY_OWNED', message: 'Café already owned' } };
      }

      if (!isFreeBuild) {
        if (state.economy.wallet.earnedCash < cost) {
          return { ok: false, state: worldState, error: { code: 'INSUFFICIENT_FUNDS', message: 'Cannot afford café business' } };
        }
        state.economy.wallet.earnedCash = Math.floor(state.economy.wallet.earnedCash - cost);
      }

      state.economy.cafe.owned = true;
      state.economy.extensions.cafeDetails.owned = true;
      state.economy.extensions.cafeDetails.isOpen = true;

      createEvent('CAFE_BUSINESS_BOUGHT', { cost: isFreeBuild ? 0 : cost });
      break;
    }

    case 'SET_CAFE_OPEN': {
      const { open } = command.payload;
      if (!state.economy.cafe.owned) {
        return { ok: false, state: worldState, error: { code: 'NOT_OWNED', message: 'Café is not owned' } };
      }
      state.economy.extensions.cafeDetails.isOpen = open;
      createEvent('CAFE_OPEN_SET', { open });
      break;
    }

    case 'RESTOCK_CAFE': {
      const { recipeId, amount } = command.payload;
      if (!state.economy.cafe.owned) {
        return { ok: false, state: worldState, error: { code: 'NOT_OWNED', message: 'Café not owned' } };
      }

      const recipe = CAFE_RECIPES.find((r) => r.id === recipeId);
      if (!recipe) {
        return { ok: false, state: worldState, error: { code: 'INVALID_RECIPE', message: 'Unknown recipe' } };
      }

      const totalCost = recipe.costToStock * amount;
      if (!isFreeBuild) {
        if (state.economy.wallet.earnedCash < totalCost) {
          return { ok: false, state: worldState, error: { code: 'INSUFFICIENT_FUNDS', message: 'Cannot afford restock' } };
        }
        state.economy.wallet.earnedCash = Math.floor(state.economy.wallet.earnedCash - totalCost);
      }

      state.economy.cafe.supplies[recipeId] = (state.economy.cafe.supplies[recipeId] || 0) + amount;
      state.economy.extensions.cafeDetails.totalExpenses += isFreeBuild ? 0 : totalCost;

      createEvent('CAFE_RESTOCKED', { recipeId, amount, totalCost: isFreeBuild ? 0 : totalCost });
      break;
    }

    case 'SERVE_CAFE_CUSTOMER': {
      const { orderId } = command.payload;
      const cafeDetails = state.economy.extensions.cafeDetails;
      const orderIndex = cafeDetails.activeOrders.findIndex((o: any) => o.orderId === orderId);

      if (orderIndex === -1) {
        return { ok: false, state: worldState, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } };
      }

      const order = cafeDetails.activeOrders[orderIndex];
      const recipe = CAFE_RECIPES.find((r) => r.id === order.recipeId);

      if (!recipe) {
        return { ok: false, state: worldState, error: { code: 'RECIPE_NOT_FOUND', message: 'Recipe not found' } };
      }

      if ((state.economy.cafe.supplies[order.recipeId] || 0) <= 0) {
        return { ok: false, state: worldState, error: { code: 'OUT_OF_STOCK', message: 'No supply to serve recipe' } };
      }

      // Deduct supply
      state.economy.cafe.supplies[order.recipeId] -= 1;

      // Single settlement revenue
      const price = recipe.sellPrice;
      if (!isFreeBuild) {
        state.economy.wallet.earnedCash = Math.floor(state.economy.wallet.earnedCash + price);
        state.economy.cafe.dailyRevenue += price;
        cafeDetails.totalRevenue += price;
      }

      // Remove active order
      cafeDetails.activeOrders.splice(orderIndex, 1);

      createEvent('CAFE_CUSTOMER_SERVED', { orderId, recipeId: order.recipeId, revenue: isFreeBuild ? 0 : price });
      break;
    }

    case 'CLAIM_GOAL_REWARD': {
      const { goalId } = command.payload;
      const goal = state.economy.goals[goalId];

      if (!goal || !goal.completed) {
        return { ok: false, state: worldState, error: { code: 'GOAL_NOT_COMPLETED', message: 'Goal is not completed' } };
      }

      if (state.economy.extensions.claimedGoalRewards[goalId]) {
        return { ok: false, state: worldState, error: { code: 'ALREADY_CLAIMED', message: 'Reward already claimed' } };
      }

      if (!isFreeBuild) {
        state.economy.wallet.earnedCash = Math.floor(state.economy.wallet.earnedCash + goal.rewardCash);
      }

      state.economy.extensions.claimedGoalRewards[goalId] = true;

      createEvent('GOAL_REWARD_CLAIMED', { goalId, rewardCash: isFreeBuild ? 0 : goal.rewardCash });
      break;
    }

    default:
      return { ok: false, state: worldState, error: { code: 'UNKNOWN_COMMAND', message: 'Unrecognized command type' } };
  }

  // Ensure invariants hold (non-negative integer wallet balance)
  state.economy.wallet.earnedCash = Math.max(0, Math.floor(state.economy.wallet.earnedCash));
  state.economy.wallet.freeBuildCash = Math.max(0, Math.floor(state.economy.wallet.freeBuildCash));

  return { ok: true, state, events };
}
