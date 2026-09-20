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
  CAREER_OUTFITS,
  MoneyProvenance,
  EconomyStats
} from './types';
import { getRngFromWorld, syncRngToWorld } from './rng';

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

function initStats(): EconomyStats {
  return {
    artworksPainted: 0,
    artworksSold: 0,
    masterpiecesPainted: 0,
    cropsHarvested: {},
    totalCropsHarvested: 0,
    careActionsCompleted: 0,
    shiftsWorkedTotal: 0
  };
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
      lastOrderCheckSimMinute: 0,
      totalOrdersServed: 0,
      totalOrdersCreated: 0
    },
    claimedGoalRewards: {},
    stats: initStats()
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
    'DEPART_FOR_WORK',
    'ARRIVE_AT_WORK',
    'RETURN_FROM_WORK',
    'FINISH_WORK_SHIFT',
    'CANCEL_WORK_SHIFT',
    'PROMOTE_CAREER',
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
        lastOrderCheckSimMinute: 0,
        totalOrdersServed: 0,
        totalOrdersCreated: 0
      },
      claimedGoalRewards: {},
      stats: initStats()
    };
  }
  if (!state.economy.extensions.stats) {
    state.economy.extensions.stats = initStats();
  }
  if (state.economy.extensions.cafeDetails.totalOrdersServed === undefined) {
    state.economy.extensions.cafeDetails.totalOrdersServed = 0;
  }
  if (state.economy.extensions.cafeDetails.totalOrdersCreated === undefined) {
    state.economy.extensions.cafeDetails.totalOrdersCreated = 0;
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
      const { catId, careerId } = command.payload || {};
      if (!catId || typeof catId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAT', message: 'Valid catId required' } };
      }
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
        workDays: [...config.ranks[0].workDays],
        performance: 50,
        title: config.ranks[0].title,
        hourlyWage: config.ranks[0].hourlyWage,
        promotionsEarned: 0,
        shiftsWorkedAtCurrentRank: 0
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

      // Synchronize Engine CatRecord careerOutfit / isAtWork
      if (state.cats?.[catId]) {
        state.cats[catId].careerOutfit = null;
        state.cats[catId].isAtWork = false;
      }

      createEvent('CAREER_JOINED', { catId, careerId, rank: 1 }, [catId]);
      break;
    }

    case 'LEAVE_CAREER': {
      const { catId } = command.payload || {};
      if (!catId || typeof catId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAT', message: 'Valid catId required' } };
      }
      if (state.economy.careers[catId]) {
        delete state.economy.careers[catId];
      }
      if (state.economy.extensions.workStates[catId]) {
        delete state.economy.extensions.workStates[catId];
      }
      if (state.cats?.[catId]) {
        state.cats[catId].careerOutfit = null;
        state.cats[catId].isAtWork = false;
      }
      createEvent('CAREER_LEFT', { catId }, [catId]);
      break;
    }

    case 'START_WORK_SHIFT': {
      const { catId, staged } = command.payload || {};
      if (!catId || typeof catId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAT', message: 'Valid catId required' } };
      }
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

      const newStatus = staged ? 'departing' : 'working';
      workState.status = newStatus;
      workState.shiftStartSimMinute = simMinute;
      workState.shiftEndSimMinute = simMinute + (career.shiftEndHour - career.shiftStartHour) * 60;
      workState.commuteUntilSimMinute = staged ? simMinute + 15 : undefined;
      workState.currentOutfitId = outfitDef.id; // saved work-state outfit visibility
      state.economy.extensions.workStates[catId] = workState;

      // Synchronize Engine CatRecord careerOutfit / isAtWork
      if (state.cats?.[catId]) {
        state.cats[catId].careerOutfit = {
          outfitId: outfitDef.id,
          careerId: career.careerId,
          rank: career.rank
        };
        state.cats[catId].isAtWork = true;
      }

      createEvent('WORK_SHIFT_STARTED', { catId, careerId: career.careerId, outfitId: outfitDef.id, status: newStatus }, [catId]);
      break;
    }

    case 'DEPART_FOR_WORK': {
      const { catId } = command.payload || {};
      if (!catId || typeof catId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAT', message: 'Valid catId required' } };
      }
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

      workState.status = 'departing';
      workState.shiftStartSimMinute = simMinute;
      workState.shiftEndSimMinute = simMinute + (career.shiftEndHour - career.shiftStartHour) * 60;
      workState.commuteUntilSimMinute = simMinute + 15;
      workState.currentOutfitId = outfitDef.id;
      state.economy.extensions.workStates[catId] = workState;

      if (state.cats?.[catId]) {
        state.cats[catId].careerOutfit = {
          outfitId: outfitDef.id,
          careerId: career.careerId,
          rank: career.rank
        };
        state.cats[catId].isAtWork = true;
      }

      createEvent('WORK_COMMUTE_DEPARTED', { catId, careerId: career.careerId, outfitId: outfitDef.id }, [catId]);
      break;
    }

    case 'ARRIVE_AT_WORK': {
      const { catId } = command.payload || {};
      const workState: CatWorkState = state.economy.extensions.workStates?.[catId];
      if (!workState || (workState.status !== 'departing' && workState.status !== 'working')) {
        return { ok: false, state: worldState, error: { code: 'NOT_DEPARTED', message: 'Cat has not departed for work' } };
      }
      workState.status = 'working';
      workState.commuteUntilSimMinute = undefined;
      createEvent('WORK_COMMUTE_ARRIVED', { catId }, [catId]);
      break;
    }

    case 'RETURN_FROM_WORK': {
      const { catId } = command.payload || {};
      const workState: CatWorkState = state.economy.extensions.workStates?.[catId];
      if (!workState || workState.status !== 'working') {
        return { ok: false, state: worldState, error: { code: 'NOT_WORKING', message: 'Cat is not currently working' } };
      }
      workState.status = 'returning';
      workState.commuteUntilSimMinute = simMinute + 15;
      createEvent('WORK_COMMUTE_RETURNING', { catId }, [catId]);
      break;
    }

    case 'FINISH_WORK_SHIFT': {
      const { catId } = command.payload || {};
      if (!catId || typeof catId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAT', message: 'Valid catId required' } };
      }
      const career = state.economy.careers[catId];
      const workState: CatWorkState = state.economy.extensions.workStates?.[catId];

      if (!career || !workState || (workState.status !== 'working' && workState.status !== 'departing' && workState.status !== 'returning')) {
        return { ok: false, state: worldState, error: { code: 'NOT_WORKING', message: 'Cat is not currently working' } };
      }

      const hoursWorked = Math.max(1, Math.floor((simMinute - workState.shiftStartSimMinute) / 60));
      const careerConfig = CAREER_CONFIGS[career.careerId as CareerId];
      const rankConfig = careerConfig?.ranks.find((r) => r.rank === career.rank) || careerConfig?.ranks[0];
      const wagePerHour = rankConfig ? rankConfig.hourlyWage : (career.hourlyWage || 15);
      const totalWage = hoursWorked * wagePerHour;

      // Ensure once-only settlement, positive cash addition
      if (!isFreeBuild && workState.lastPaidSimMinute !== simMinute) {
        state.economy.wallet.earnedCash = Math.max(0, Math.floor(state.economy.wallet.earnedCash + totalWage));
      }

      workState.status = 'off_work';
      workState.currentOutfitId = null; // restore ordinary appearance
      workState.daysWorked += 1;
      workState.lastPaidSimMinute = simMinute;
      career.shiftsWorkedAtCurrentRank = (career.shiftsWorkedAtCurrentRank || 0) + 1;
      career.performance = Math.min(100, (career.performance || 50) + 10);

      // Synchronize Engine CatRecord careerOutfit / isAtWork
      if (state.cats?.[catId]) {
        state.cats[catId].careerOutfit = null;
        state.cats[catId].isAtWork = false;
      }

      // Update stats
      state.economy.extensions.stats = state.economy.extensions.stats || initStats();
      state.economy.extensions.stats.shiftsWorkedTotal += 1;

      createEvent('WORK_SHIFT_FINISHED', { catId, hoursWorked, wageEarned: isFreeBuild ? 0 : totalWage }, [catId]);

      // Check auto-promotion upon completing shift
      if (career.rank < 3) {
        const nextRankNum = (career.rank + 1) as 2 | 3;
        const nextRankConfig = careerConfig?.ranks.find((r) => r.rank === nextRankNum);
        const cat = state.cats?.[catId];
        const skillKey = nextRankConfig?.requiredSkill || 'social';
        const currentSkillLevel = cat?.skills?.[skillKey] ?? 0;

        if (
          nextRankConfig &&
          currentSkillLevel >= nextRankConfig.requiredSkillLevel &&
          career.shiftsWorkedAtCurrentRank >= nextRankConfig.requiredDaysWorked &&
          career.performance >= nextRankConfig.requiredPerformance
        ) {
          career.rank = nextRankNum;
          career.title = nextRankConfig.title;
          career.hourlyWage = nextRankConfig.hourlyWage;
          career.shiftStartHour = nextRankConfig.shiftStartHour;
          career.shiftEndHour = nextRankConfig.shiftEndHour;
          career.workDays = [...nextRankConfig.workDays];
          career.promotionsEarned = (career.promotionsEarned || 0) + 1;
          career.shiftsWorkedAtCurrentRank = 0;
          createEvent('CAREER_PROMOTED', { catId, careerId: career.careerId, newRank: nextRankNum, title: career.title }, [catId]);
        }
      }
      break;
    }

    case 'CANCEL_WORK_SHIFT': {
      const { catId } = command.payload || {};
      if (!catId || typeof catId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAT', message: 'Valid catId required' } };
      }
      const workState: CatWorkState = state.economy.extensions.workStates?.[catId];
      if (workState) {
        workState.status = 'off_work';
        workState.currentOutfitId = null; // restore ordinary appearance
      }
      if (state.cats?.[catId]) {
        state.cats[catId].careerOutfit = null;
        state.cats[catId].isAtWork = false;
      }
      createEvent('WORK_SHIFT_CANCELLED', { catId }, [catId]);
      break;
    }

    case 'PROMOTE_CAREER': {
      const { catId } = command.payload || {};
      if (!catId || typeof catId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAT', message: 'Valid catId required' } };
      }
      const career = state.economy.careers?.[catId];
      if (!career) {
        return { ok: false, state: worldState, error: { code: 'NO_CAREER', message: 'Cat has no career' } };
      }

      if (career.rank >= 3) {
        return { ok: false, state: worldState, error: { code: 'MAX_RANK_REACHED', message: 'Cat is already at maximum rank 3' } };
      }

      const nextRankNum = (career.rank + 1) as 2 | 3;
      const careerConfig = CAREER_CONFIGS[career.careerId as CareerId];
      const nextRankConfig = careerConfig?.ranks.find((r) => r.rank === nextRankNum);
      if (!nextRankConfig) {
        return { ok: false, state: worldState, error: { code: 'INVALID_RANK', message: 'Next rank configuration not found' } };
      }

      const cat = state.cats?.[catId];
      const skillKey = nextRankConfig.requiredSkill;
      const currentSkillLevel = cat?.skills?.[skillKey] ?? 0;
      const workState = state.economy.extensions.workStates?.[catId];
      const shiftsWorked = Math.max(career.shiftsWorkedAtCurrentRank || 0, workState?.daysWorked || 0);

      if (currentSkillLevel < nextRankConfig.requiredSkillLevel) {
        return {
          ok: false,
          state: worldState,
          error: {
            code: 'INSUFFICIENT_SKILL',
            message: `Requires ${skillKey} level ${nextRankConfig.requiredSkillLevel}, current level is ${currentSkillLevel}`
          }
        };
      }

      if (shiftsWorked < nextRankConfig.requiredDaysWorked) {
        return {
          ok: false,
          state: worldState,
          error: {
            code: 'INSUFFICIENT_EXPERIENCE',
            message: `Requires at least ${nextRankConfig.requiredDaysWorked} shifts worked, current is ${shiftsWorked}`
          }
        };
      }

      career.rank = nextRankNum;
      career.title = nextRankConfig.title;
      career.hourlyWage = nextRankConfig.hourlyWage;
      career.shiftStartHour = nextRankConfig.shiftStartHour;
      career.shiftEndHour = nextRankConfig.shiftEndHour;
      career.workDays = [...nextRankConfig.workDays];
      career.promotionsEarned = (career.promotionsEarned || 0) + 1;
      career.shiftsWorkedAtCurrentRank = 0;

      if (state.cats?.[catId]?.isAtWork) {
        const outfitDef = CAREER_OUTFITS[career.careerId as CareerId];
        state.cats[catId].careerOutfit = {
          outfitId: outfitDef.id,
          careerId: career.careerId,
          rank: career.rank
        };
      }

      createEvent('CAREER_PROMOTED', { catId, careerId: career.careerId, newRank: nextRankNum, title: career.title }, [catId]);
      break;
    }

    case 'START_PAINTING': {
      const { catId, easelObjectId, title } = command.payload || {};
      if (!catId || typeof catId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAT', message: 'Valid catId required' } };
      }
      if (!easelObjectId || typeof easelObjectId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_EASEL', message: 'Valid easelObjectId required' } };
      }

      const cat = state.cats?.[catId];
      if (!cat || cat.lifeStatus === 'deceased') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CAT', message: 'Cat not found or deceased' } };
      }

      let easel: EaselState = state.economy.extensions.easels[easelObjectId];
      if (!easel) {
        easel = {
          easelObjectId,
          currentCatId: catId,
          progressMinutes: 0,
          targetMinutes: 60,
          artworkTitle: title || 'Untitled Masterpiece',
          provenance: isFreeBuild ? 'free_build' : 'earned'
        };
      } else {
        if (easel.currentCatId && easel.currentCatId !== catId && state.cats?.[easel.currentCatId]?.lifeStatus === 'living') {
          return { ok: false, state: worldState, error: { code: 'EASEL_OCCUPIED', message: 'Easel already in use by another cat' } };
        }
        easel.currentCatId = catId;
        if (title) easel.artworkTitle = title;
      }
      state.economy.extensions.easels[easelObjectId] = easel;
      createEvent('PAINTING_STARTED', { catId, easelObjectId }, [catId]);
      break;
    }

    case 'PROGRESS_PAINTING': {
      const { catId, easelObjectId, elapsedMinutes } = command.payload || {};
      if (!Number.isFinite(elapsedMinutes) || !Number.isInteger(elapsedMinutes) || elapsedMinutes <= 0) {
        return { ok: false, state: worldState, error: { code: 'INVALID_ELAPSED_MINUTES', message: 'Elapsed minutes must be a positive integer' } };
      }
      const easel: EaselState = state.economy.extensions.easels[easelObjectId];
      if (!easel || easel.currentCatId !== catId) {
        return { ok: false, state: worldState, error: { code: 'INVALID_EASEL', message: 'Easel not actively in use by cat' } };
      }

      easel.progressMinutes = Math.min(easel.targetMinutes, easel.progressMinutes + elapsedMinutes);
      createEvent('PAINTING_PROGRESS', { catId, easelObjectId, progressMinutes: easel.progressMinutes }, [catId]);
      break;
    }

    case 'FINISH_PAINTING': {
      const { catId, easelObjectId } = command.payload || {};
      const easel: EaselState = state.economy.extensions.easels[easelObjectId];
      if (!easel || easel.currentCatId !== catId) {
        return { ok: false, state: worldState, error: { code: 'INVALID_EASEL', message: 'Easel not in use by cat' } };
      }
      if (easel.progressMinutes < easel.targetMinutes) {
        return { ok: false, state: worldState, error: { code: 'INCOMPLETE_PAINTING', message: 'Painting not yet complete' } };
      }

      const cat = state.cats?.[catId];
      const skillLevel = cat?.skills?.painting || 1;

      // Deterministic seeded RNG draw (no Math.random or Date.now)
      const rng = getRngFromWorld(state);
      const roll = rng.drawInt(0, 99, 'artwork_quality', simMinute);
      syncRngToWorld(state, rng);

      let quality: 'basic' | 'fine' | 'masterpiece' = 'basic';
      let value = 30 + skillLevel * 10;

      if (skillLevel >= 5 && roll >= 70) {
        quality = 'masterpiece';
        value = 150 + skillLevel * 20;
      } else if (skillLevel >= 2 && roll >= 40) {
        quality = 'fine';
        value = 75 + skillLevel * 15;
      }

      const artworkProvenance: MoneyProvenance = (easel.provenance === 'free_build' || isFreeBuild) ? 'free_build' : 'earned';
      const artworkId = `art_${catId}_${simMinute}_${seq}`;
      const artwork: Artwork = {
        id: artworkId,
        artistCatId: catId,
        title: easel.artworkTitle || 'Untitled Painting',
        quality,
        value,
        createdAtSimMinute: simMinute,
        provenance: artworkProvenance,
        isDisplayed: false
      };

      state.economy.extensions.artworks[artworkId] = artwork;
      delete state.economy.extensions.easels[easelObjectId]; // clear easel WIP

      // Track stats
      state.economy.extensions.stats = state.economy.extensions.stats || initStats();
      state.economy.extensions.stats.artworksPainted += 1;
      if (quality === 'masterpiece' && artworkProvenance === 'earned') {
        state.economy.extensions.stats.masterpiecesPainted += 1;
      }

      createEvent('PAINTING_FINISHED', { catId, artworkId, quality, value, provenance: artworkProvenance }, [catId]);
      break;
    }

    case 'DISPLAY_ARTWORK': {
      const { artworkId, lotId, x, y } = command.payload || {};
      const artwork: Artwork = state.economy.extensions.artworks?.[artworkId];
      if (!artwork) {
        return { ok: false, state: worldState, error: { code: 'ARTWORK_NOT_FOUND', message: 'Artwork does not exist' } };
      }
      artwork.isDisplayed = true;
      artwork.lotId = lotId;
      artwork.x = x;
      artwork.y = y;
      createEvent('ARTWORK_DISPLAYED', { artworkId, lotId, x, y });
      break;
    }

    case 'SELL_ARTWORK': {
      const { artworkId } = command.payload || {};
      if (!artworkId || typeof artworkId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_ARTWORK_ID', message: 'Artwork ID must be provided' } };
      }
      const artwork: Artwork = state.economy.extensions.artworks?.[artworkId];
      if (!artwork) {
        return { ok: false, state: worldState, error: { code: 'ARTWORK_NOT_FOUND', message: 'Artwork does not exist' } };
      }

      // Exactly once settlement & provenance validation
      if (artwork.provenance === 'earned' && !isFreeBuild) {
        state.economy.wallet.earnedCash = Math.floor(state.economy.wallet.earnedCash + artwork.value);
      }

      delete state.economy.extensions.artworks[artworkId];

      state.economy.extensions.stats = state.economy.extensions.stats || initStats();
      state.economy.extensions.stats.artworksSold += 1;

      createEvent('ARTWORK_SOLD', { artworkId, value: artwork.provenance === 'earned' ? artwork.value : 0 });
      break;
    }

    case 'PLANT_CROP': {
      const { plotObjectId, cropType } = command.payload || {};
      if (!plotObjectId || typeof plotObjectId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_PLOT', message: 'Plot object ID required' } };
      }
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
      createEvent('CROP_PLANTED', { plotObjectId, cropType, cost: isFreeBuild ? 0 : cropConfig.seedCost });
      break;
    }

    case 'WATER_CROP': {
      const { plotObjectId } = command.payload || {};
      if (!plotObjectId || typeof plotObjectId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_PLOT', message: 'Plot object ID required' } };
      }
      const plot: GardenPlotState = state.economy.extensions.gardenPlots?.[plotObjectId];
      if (!plot || !plot.cropType) {
        return { ok: false, state: worldState, error: { code: 'NO_CROP', message: 'No crop planted in plot' } };
      }

      plot.lastWateredSimMinute = simMinute;
      plot.isWithered = false;
      createEvent('CROP_WATERED', { plotObjectId });
      break;
    }

    case 'HARVEST_CROP': {
      const { plotObjectId } = command.payload || {};
      if (!plotObjectId || typeof plotObjectId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_PLOT', message: 'Plot object ID required' } };
      }
      const plot: GardenPlotState = state.economy.extensions.gardenPlots?.[plotObjectId];
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

      // Track stats
      state.economy.extensions.stats = state.economy.extensions.stats || initStats();
      state.economy.extensions.stats.totalCropsHarvested += yieldQty;
      state.economy.extensions.stats.cropsHarvested[plot.cropType] =
        (state.economy.extensions.stats.cropsHarvested[plot.cropType] || 0) + yieldQty;

      // Clear plot after harvest
      delete state.economy.extensions.gardenPlots[plotObjectId];

      createEvent('CROP_HARVESTED', { plotObjectId, cropType: plot.cropType, yieldQuantity: yieldQty, provenance: plot.provenance });
      break;
    }

    case 'SELL_ITEM': {
      const { itemId, quantity } = command.payload || {};
      if (!itemId || typeof itemId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_ITEM_ID', message: 'Item ID must be a non-empty string' } };
      }
      if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
        return { ok: false, state: worldState, error: { code: 'INVALID_QUANTITY', message: 'Quantity must be a positive integer' } };
      }

      const item = state.economy.inventory?.[itemId];
      if (!item || !Number.isFinite(item.quantity) || item.quantity < quantity) {
        return { ok: false, state: worldState, error: { code: 'INVALID_ITEM_QUANTITY', message: 'Item not available or insufficient quantity' } };
      }

      // Calculate unit price based on catalog/crop
      let unitPrice = 10;
      if (itemId.includes('tomato')) unitPrice = CROP_CONFIGS.tomato.baseSellPrice;
      else if (itemId.includes('strawberry')) unitPrice = CROP_CONFIGS.strawberry.baseSellPrice;
      else if (itemId.includes('catnip')) unitPrice = CROP_CONFIGS.catnip.baseSellPrice;

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
      const { catalogId, quantity } = command.payload || {};
      if (!catalogId || typeof catalogId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_CATALOG_ID', message: 'Catalog ID must be a non-empty string' } };
      }
      if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
        return { ok: false, state: worldState, error: { code: 'INVALID_QUANTITY', message: 'Quantity must be a positive integer' } };
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
      const { open } = command.payload || {};
      if (!state.economy.cafe.owned) {
        return { ok: false, state: worldState, error: { code: 'NOT_OWNED', message: 'Café is not owned' } };
      }
      state.economy.extensions.cafeDetails.isOpen = Boolean(open);
      createEvent('CAFE_OPEN_SET', { open: Boolean(open) });
      break;
    }

    case 'RESTOCK_CAFE': {
      const { recipeId, amount } = command.payload || {};
      if (!state.economy.cafe.owned) {
        return { ok: false, state: worldState, error: { code: 'NOT_OWNED', message: 'Café not owned' } };
      }

      if (!recipeId || typeof recipeId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_RECIPE', message: 'Recipe ID required' } };
      }

      if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
        return { ok: false, state: worldState, error: { code: 'INVALID_AMOUNT', message: 'Restock amount must be a positive integer' } };
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
      const { orderId } = command.payload || {};
      if (!orderId || typeof orderId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_ORDER', message: 'Valid orderId required' } };
      }
      const cafeDetails = state.economy.extensions.cafeDetails;
      if (!cafeDetails || !cafeDetails.owned) {
        return { ok: false, state: worldState, error: { code: 'NOT_OWNED', message: 'Café not owned' } };
      }

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

      cafeDetails.totalOrdersServed = (cafeDetails.totalOrdersServed || 0) + 1;

      // Remove active order
      cafeDetails.activeOrders.splice(orderIndex, 1);

      createEvent('CAFE_CUSTOMER_SERVED', { orderId, recipeId: order.recipeId, revenue: isFreeBuild ? 0 : price });
      break;
    }

    case 'CLAIM_GOAL_REWARD': {
      const { goalId } = command.payload || {};
      if (!goalId || typeof goalId !== 'string') {
        return { ok: false, state: worldState, error: { code: 'INVALID_GOAL_ID', message: 'Valid goalId required' } };
      }
      const goal = state.economy.goals?.[goalId];
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

  // Append central command receipt for idempotency ledger
  if (context?.commandId) {
    state.commandReceipts = state.commandReceipts || [];
    state.commandReceipts.push({
      commandId: context.commandId,
      simMinute,
      actorId: context.actorId || 'system',
      type: command.type,
      success: true,
      receiptChecksum: `chk_${command.type}_${simMinute}_${seq}`
    });
    if (state.commandReceipts.length > 100) {
      state.commandReceipts = state.commandReceipts.slice(-100);
    }
  }

  state.nextEventSequence = seq;

  return { ok: true, state, events };
}
