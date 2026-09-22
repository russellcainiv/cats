// src/domain/economy/advance.ts

import { CROP_CONFIGS, CAFE_RECIPES } from './constants';
import { GardenPlotState, CatWorkState, CAREER_OUTFITS, CareerId, CafeCustomerOrder } from './types';

export function advanceEconomy(worldState: any, elapsedSimMinutes: number): any {
  if (elapsedSimMinutes <= 0) return worldState;

  const state = JSON.parse(JSON.stringify(worldState));
  if (!state.economy || !state.economy.extensions) {
    return state;
  }

  const simMinute = (state.clock?.simMinute || 0) + elapsedSimMinutes;
  if (state.clock) {
    state.clock.simMinute = simMinute;
  }

  const { gardenPlots, workStates, cafeDetails } = state.economy.extensions;

  // 1. Advance Garden Plots
  if (gardenPlots) {
    for (const plotId of Object.keys(gardenPlots)) {
      const plot: GardenPlotState = gardenPlots[plotId];
      if (!plot.cropType || plot.isHarvestable || plot.isWithered) continue;

      const cropConfig = CROP_CONFIGS[plot.cropType];
      if (!cropConfig) continue;

      plot.growthProgressMinutes += elapsedSimMinutes;

      // Check watering and withering
      const unwateredTime = simMinute - (plot.lastWateredSimMinute ?? simMinute);
      if (unwateredTime > cropConfig.waterIntervalMinutes * 2) {
        plot.isWithered = true;
      } else if (plot.growthProgressMinutes >= cropConfig.growthTimeMinutes) {
        plot.isHarvestable = true;
      }
    }
  }

  // 2. Advance Careers / Work Shifts
  if (workStates) {
    for (const catId of Object.keys(workStates)) {
      const workState: CatWorkState = workStates[catId];
      const career = state.economy.careers?.[catId];
      const cat = state.cats?.[catId];

      // Handle deceased / interrupted cat while working
      if (cat && cat.lifeStatus === 'deceased' && workState.status === 'working') {
        workState.status = 'off_work';
        workState.currentOutfitId = null; // restore ordinary appearance
        continue;
      }

      if (career && workState.status === 'working') {
        const outfitDef = CAREER_OUTFITS[career.careerId as CareerId];
        workState.currentOutfitId = outfitDef ? outfitDef.id : null;

        // Auto-complete shift when time expires
        if (simMinute >= workState.shiftEndSimMinute) {
          const hoursWorked = Math.max(1, Math.floor((workState.shiftEndSimMinute - workState.shiftStartSimMinute) / 60));
          const wage = hoursWorked * 15; // default rate

          const isFreeBuild = state.wallet?.mode && state.wallet.mode !== 'normal';
          if (!isFreeBuild) {
            state.economy.wallet.earnedCash = Math.max(0, Math.floor(state.economy.wallet.earnedCash + wage));
          }

          workState.status = 'off_work';
          workState.currentOutfitId = null; // restore ordinary appearance
          workState.daysWorked += 1;
          workState.lastPaidSimMinute = simMinute;
        }
      }
    }
  }

  // 3. Advance Café Operations (Generates customer orders when open and stocked)
  if (cafeDetails && cafeDetails.owned && cafeDetails.isOpen) {
    const lastCheck = cafeDetails.lastOrderCheckSimMinute ?? 0;
    const timeSinceLastCheck = simMinute - lastCheck;
    if (timeSinceLastCheck >= 30) { // check every 30 sim minutes
      cafeDetails.lastOrderCheckSimMinute = simMinute;

      // Clean up expired orders
      cafeDetails.activeOrders = cafeDetails.activeOrders.filter((order: CafeCustomerOrder) => simMinute < order.expiresAtSimMinute);

      // Generate a customer order if queue has room
      if (cafeDetails.activeOrders.length < 3) {
        const randomRecipe = CAFE_RECIPES[Math.floor(Math.random() * CAFE_RECIPES.length)];
        const newOrder: CafeCustomerOrder = {
          orderId: `ord_${simMinute}_${Math.floor(Math.random() * 1000)}`,
          customerId: `npc_cust_${Math.floor(Math.random() * 8) + 1}`,
          recipeId: randomRecipe.id,
          orderedAtSimMinute: simMinute,
          expiresAtSimMinute: simMinute + 60, // 1 hour order window
          fulfilled: false
        };
        cafeDetails.activeOrders.push(newOrder);
      }
    }
  }

  // 4. Goal Progress Check
  if (state.economy.goals) {
    const goals = state.economy.goals;

    // Check care goal
    if (goals.goal_care_1 && !goals.goal_care_1.completed) {
      if (state.events?.some((e: any) => e.type === 'DIRECT_CARE' || e.type === 'CARE_ACTION')) {
        goals.goal_care_1.progress = 1;
        goals.goal_care_1.completed = true;
      }
    }

    // Check work goals
    if (goals.goal_work_1 && !goals.goal_work_1.completed) {
      const workedCount = Object.values(workStates || {}).reduce((acc: number, ws: any) => acc + (ws.daysWorked || 0), 0);
      goals.goal_work_1.progress = Math.min(1, workedCount);
      if (workedCount >= 1) goals.goal_work_1.completed = true;
    }

    // Check café goal
    if (goals.goal_business_1 && !goals.goal_business_1.completed) {
      if (cafeDetails?.owned) {
        goals.goal_business_1.progress = 1;
        goals.goal_business_1.completed = true;
      }
    }
  }

  return state;
}
