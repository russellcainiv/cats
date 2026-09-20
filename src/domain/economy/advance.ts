// src/domain/economy/advance.ts

import { CROP_CONFIGS, CAFE_RECIPES, CAREER_CONFIGS } from './constants';
import {
  GardenPlotState,
  CatWorkState,
  CAREER_OUTFITS,
  CareerId,
  CafeCustomerOrder,
  EconomyStats
} from './types';
import { getRngFromWorld, syncRngToWorld } from './rng';

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

export function advanceEconomy(worldState: any, elapsedSimMinutes: number): any {
  if (elapsedSimMinutes <= 0) return worldState;

  const state = JSON.parse(JSON.stringify(worldState));
  if (!state.economy || !state.economy.extensions) {
    return state;
  }

  // Contract alignment: economy module reads the clock without mutating it!
  // The central engine advances the clock once to the end-of-step boundary.
  const simMinute = state.clock?.simMinute || 0;

  const { gardenPlots, workStates, cafeDetails } = state.economy.extensions;
  if (!state.economy.extensions.stats) {
    state.economy.extensions.stats = initStats();
  }

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

  // 2. Advance Careers / Work Shifts / Commute
  if (workStates) {
    for (const catId of Object.keys(workStates)) {
      const workState: CatWorkState = workStates[catId];
      const career = state.economy.careers?.[catId];
      const cat = state.cats?.[catId];

      // Handle deceased / interrupted cat while working
      if (cat && cat.lifeStatus === 'deceased') {
        workState.status = 'off_work';
        workState.currentOutfitId = null;
        if (state.cats?.[catId]) {
          state.cats[catId].careerOutfit = null;
          state.cats[catId].isAtWork = false;
        }
        continue;
      }

      if (career) {
        const outfitDef = CAREER_OUTFITS[career.careerId as CareerId];

        // Handle departing commute stage
        if (workState.status === 'departing') {
          workState.currentOutfitId = outfitDef ? outfitDef.id : null;
          if (state.cats?.[catId]) {
            state.cats[catId].careerOutfit = { outfitId: outfitDef.id, careerId: career.careerId, rank: career.rank };
            state.cats[catId].isAtWork = true;
          }
          if (workState.commuteUntilSimMinute !== undefined && simMinute >= workState.commuteUntilSimMinute) {
            workState.status = 'working';
            workState.commuteUntilSimMinute = undefined;
          }
        }

        // Handle returning commute stage
        if (workState.status === 'returning') {
          workState.currentOutfitId = outfitDef ? outfitDef.id : null;
          if (workState.commuteUntilSimMinute !== undefined && simMinute >= workState.commuteUntilSimMinute) {
            workState.status = 'off_work';
            workState.currentOutfitId = null;
            workState.commuteUntilSimMinute = undefined;
            if (state.cats?.[catId]) {
              state.cats[catId].careerOutfit = null;
              state.cats[catId].isAtWork = false;
            }
          }
        }

        // Handle working stage
        if (workState.status === 'working') {
          workState.currentOutfitId = outfitDef ? outfitDef.id : null;
          if (state.cats?.[catId]) {
            state.cats[catId].careerOutfit = { outfitId: outfitDef.id, careerId: career.careerId, rank: career.rank };
            state.cats[catId].isAtWork = true;
          }

          // Auto-complete shift when time expires
          if (simMinute >= workState.shiftEndSimMinute) {
            const hoursWorked = Math.max(1, Math.floor((workState.shiftEndSimMinute - workState.shiftStartSimMinute) / 60));
            const careerConfig = CAREER_CONFIGS[career.careerId as CareerId];
            const rankConfig = careerConfig?.ranks.find((r) => r.rank === career.rank) || careerConfig?.ranks[0];
            const wagePerHour = rankConfig ? rankConfig.hourlyWage : (career.hourlyWage || 15);
            const wage = hoursWorked * wagePerHour;

            const isFreeBuild = state.wallet?.mode && state.wallet.mode !== 'normal';
            if (!isFreeBuild && workState.lastPaidSimMinute !== simMinute) {
              state.economy.wallet.earnedCash = Math.max(0, Math.floor(state.economy.wallet.earnedCash + wage));
            }

            workState.status = 'off_work';
            workState.currentOutfitId = null; // restore ordinary appearance
            workState.daysWorked += 1;
            workState.lastPaidSimMinute = simMinute;
            career.shiftsWorkedAtCurrentRank = (career.shiftsWorkedAtCurrentRank || 0) + 1;
            career.performance = Math.min(100, (career.performance || 50) + 10);

            if (state.cats?.[catId]) {
              state.cats[catId].careerOutfit = null;
              state.cats[catId].isAtWork = false;
            }

            state.economy.extensions.stats.shiftsWorkedTotal += 1;

            // Check auto-promotion upon completing shift
            if (career.rank < 3) {
              const nextRankNum = (career.rank + 1) as 2 | 3;
              const nextRankConfig = careerConfig?.ranks.find((r) => r.rank === nextRankNum);
              const skillKey = nextRankConfig?.requiredSkill || 'social';
              const currentSkill = cat?.skills?.[skillKey] ?? 0;

              if (
                nextRankConfig &&
                currentSkill >= nextRankConfig.requiredSkillLevel &&
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
              }
            }
          }
        }
      }
    }
  }

  // 3. Advance Café Operations (Generates customer orders when open using SeededRng)
  if (cafeDetails && cafeDetails.owned && cafeDetails.isOpen) {
    const lastCheck = cafeDetails.lastOrderCheckSimMinute ?? 0;
    const timeSinceLastCheck = simMinute - lastCheck;

    if (timeSinceLastCheck >= 30) {
      cafeDetails.lastOrderCheckSimMinute = simMinute;

      // Clean up expired orders
      cafeDetails.activeOrders = cafeDetails.activeOrders.filter(
        (order: CafeCustomerOrder) => simMinute < order.expiresAtSimMinute
      );

      // Generate a customer order if queue has room
      if (cafeDetails.activeOrders.length < 3) {
        const unlockedRecipes = CAFE_RECIPES.filter((r) => r.unlocked);
        if (unlockedRecipes.length > 0) {
          const rng = getRngFromWorld(state);
          const chosenRecipe = rng.drawChoice(unlockedRecipes, 'cafe_order', simMinute);
          const customerNum = rng.drawInt(1, 8, 'cafe_customer', simMinute);
          syncRngToWorld(state, rng);

          cafeDetails.totalOrdersCreated = (cafeDetails.totalOrdersCreated || 0) + 1;
          const newOrder: CafeCustomerOrder = {
            orderId: `ord_${simMinute}_${cafeDetails.totalOrdersCreated}`,
            customerId: `npc_cust_${customerNum}`,
            recipeId: chosenRecipe.id,
            orderedAtSimMinute: simMinute,
            expiresAtSimMinute: simMinute + 60, // 1 hour order window
            fulfilled: false
          };
          cafeDetails.activeOrders.push(newOrder);
        }
      }
    }
  }

  // 4. Evidence-Driven Evaluation of All 18 Goals
  if (state.economy.goals) {
    evaluateGoals(state, simMinute);
  }

  return state;
}

/**
 * Evaluates progress across all 18 goals using actual world state evidence.
 * Enforces earned provenance: free-build actions do not counterfeit earned goals.
 */
function evaluateGoals(state: any, simMinute: number): void {
  const goals = state.economy.goals;
  const stats: EconomyStats = state.economy.extensions?.stats || initStats();
  const workStates = state.economy.extensions?.workStates || {};
  const cafeDetails = state.economy.extensions?.cafeDetails;

  // 1. goal_care_1: First Care (Target: 1)
  if (goals.goal_care_1 && !goals.goal_care_1.completed) {
    const hasCareEvent = state.events?.some((e: any) =>
      e.type === 'DIRECT_CARE' || e.type === 'CARE_ACTION' || e.type === 'CAT_FED' || e.type === 'CAT_GROOMED'
    );
    const careCount = hasCareEvent || stats.careActionsCompleted > 0 ? 1 : 0;
    goals.goal_care_1.progress = Math.min(goals.goal_care_1.target, careCount);
    if (goals.goal_care_1.progress >= goals.goal_care_1.target) {
      goals.goal_care_1.completed = true;
    }
  }

  // 2. goal_care_2: Attentive Caregiver (Target: 10)
  if (goals.goal_care_2 && !goals.goal_care_2.completed) {
    const livingCats = Object.values(state.cats || {}).filter((c: any) => c.lifeStatus === 'living');
    const allNeedsHigh = livingCats.length > 0 && livingCats.every((c: any) => {
      const n = c.needs;
      return n && n.hunger >= 70 && n.energy >= 70 && n.comfort >= 70 && n.hygiene >= 70;
    });
    const careActions = state.events?.filter((e: any) =>
      e.type === 'DIRECT_CARE' || e.type === 'CARE_ACTION' || e.type === 'CAT_FED' || e.type === 'CAT_GROOMED'
    ).length || 0;
    const progressVal = Math.max(stats.careActionsCompleted, careActions, allNeedsHigh ? 10 : 0);
    goals.goal_care_2.progress = Math.min(goals.goal_care_2.target, progressVal);
    if (goals.goal_care_2.progress >= goals.goal_care_2.target) {
      goals.goal_care_2.completed = true;
    }
  }

  // 3. goal_relationships_1: Making Friends (Target: 1)
  if (goals.goal_relationships_1 && !goals.goal_relationships_1.completed) {
    let hasFriend = false;
    for (const cat of Object.values(state.cats || {}) as any[]) {
      if (cat.relationships) {
        for (const rel of Object.values(cat.relationships) as any[]) {
          if (rel.friendship >= 50) {
            hasFriend = true;
            break;
          }
        }
      }
      if (hasFriend) break;
    }
    const hasFriendEvent = state.events?.some((e: any) => e.type === 'FRIENDSHIP_FORMED' || e.type === 'FRIENDS');
    if (hasFriend || hasFriendEvent) {
      goals.goal_relationships_1.progress = 1;
      goals.goal_relationships_1.completed = true;
    }
  }

  // 4. goal_relationships_2: True Love (Target: 1)
  if (goals.goal_relationships_2 && !goals.goal_relationships_2.completed) {
    let hasLove = false;
    for (const cat of Object.values(state.cats || {}) as any[]) {
      if (cat.relationships) {
        for (const rel of Object.values(cat.relationships) as any[]) {
          if (rel.isLove || rel.romance >= 80) {
            hasLove = true;
            break;
          }
        }
      }
      if (hasLove) break;
    }
    const hasLoveEvent = state.events?.some((e: any) => e.type === 'LOVE_DECLARED' || e.type === 'TRUE_LOVE');
    if (hasLove || hasLoveEvent) {
      goals.goal_relationships_2.progress = 1;
      goals.goal_relationships_2.completed = true;
    }
  }

  // 5. goal_building_1: Home Decorator (Target: 5 earned objects placed)
  if (goals.goal_building_1 && !goals.goal_building_1.completed) {
    let earnedObjectsCount = 0;
    const homeLot = state.building?.lots?.lot_home;
    if (homeLot?.objects) {
      earnedObjectsCount = homeLot.objects.filter((o: any) => o.provenance === 'earned').length;
    }
    const earnedPlacementsInEvents = state.events?.filter((e: any) =>
      (e.type === 'OBJECT_PLACED' || e.type === 'FURNITURE_PLACED') && e.payload?.provenance === 'earned'
    ).length || 0;
    const count = Math.max(earnedObjectsCount, earnedPlacementsInEvents);
    goals.goal_building_1.progress = Math.min(goals.goal_building_1.target, count);
    if (goals.goal_building_1.progress >= goals.goal_building_1.target) {
      goals.goal_building_1.completed = true;
    }
  }

  // 6. goal_building_2: Master Builder (Target: 1 earned wall/room built)
  if (goals.goal_building_2 && !goals.goal_building_2.completed) {
    let earnedWallsCount = 0;
    const homeLot = state.building?.lots?.lot_home;
    if (homeLot?.walls) {
      earnedWallsCount = homeLot.walls.filter((w: any) => w.provenance === 'earned').length;
    }
    const earnedWallEvents = state.events?.filter((e: any) =>
      (e.type === 'WALL_BUILT' || e.type === 'ROOM_BUILT') && e.payload?.provenance === 'earned'
    ).length || 0;
    if (earnedWallsCount > 0 || earnedWallEvents > 0) {
      goals.goal_building_2.progress = 1;
      goals.goal_building_2.completed = true;
    }
  }

  // 7. goal_work_1: First Shift (Target: 1)
  if (goals.goal_work_1 && !goals.goal_work_1.completed) {
    const workedCount = Object.values(workStates || {}).reduce((acc: number, ws: any) => acc + (ws.daysWorked || 0), 0);
    const total = Math.max(workedCount, stats.shiftsWorkedTotal);
    goals.goal_work_1.progress = Math.min(goals.goal_work_1.target, total);
    if (goals.goal_work_1.progress >= goals.goal_work_1.target) {
      goals.goal_work_1.completed = true;
    }
  }

  // 8. goal_work_2: Hard Worker (Target: 5 shifts)
  if (goals.goal_work_2 && !goals.goal_work_2.completed) {
    const workedCount = Object.values(workStates || {}).reduce((acc: number, ws: any) => acc + (ws.daysWorked || 0), 0);
    const total = Math.max(workedCount, stats.shiftsWorkedTotal);
    goals.goal_work_2.progress = Math.min(goals.goal_work_2.target, total);
    if (goals.goal_work_2.progress >= goals.goal_work_2.target) {
      goals.goal_work_2.completed = true;
    }
  }

  // 9. goal_work_3: Career Promotion (Target: 1 cat reached rank 2+)
  if (goals.goal_work_3 && !goals.goal_work_3.completed) {
    const highestRank = Object.values(state.economy.careers || {}).reduce((max: number, c: any) => Math.max(max, c.rank || 1), 1);
    if (highestRank >= 2) {
      goals.goal_work_3.progress = 1;
      goals.goal_work_3.completed = true;
    }
  }

  // 10. goal_hobbies_1: Budding Artist (Target: 1 artwork painted)
  if (goals.goal_hobbies_1 && !goals.goal_hobbies_1.completed) {
    const earnedArtworks = Object.values(state.economy.extensions?.artworks || {}).filter((a: any) => a.provenance === 'earned').length;
    const total = Math.max(earnedArtworks + stats.artworksSold, stats.artworksPainted);
    goals.goal_hobbies_1.progress = Math.min(goals.goal_hobbies_1.target, total);
    if (goals.goal_hobbies_1.progress >= goals.goal_hobbies_1.target) {
      goals.goal_hobbies_1.completed = true;
    }
  }

  // 11. goal_hobbies_2: Masterpiece Painter (Target: 1 earned masterpiece)
  if (goals.goal_hobbies_2 && !goals.goal_hobbies_2.completed) {
    const hasMasterpiece = Object.values(state.economy.extensions?.artworks || {}).some(
      (a: any) => a.quality === 'masterpiece' && a.provenance === 'earned'
    );
    if (hasMasterpiece || stats.masterpiecesPainted > 0) {
      goals.goal_hobbies_2.progress = 1;
      goals.goal_hobbies_2.completed = true;
    }
  }

  // 12. goal_hobbies_3: Green Thumb (Target: 3 crops harvested)
  if (goals.goal_hobbies_3 && !goals.goal_hobbies_3.completed) {
    const totalHarvested = stats.totalCropsHarvested;
    goals.goal_hobbies_3.progress = Math.min(goals.goal_hobbies_3.target, totalHarvested);
    if (goals.goal_hobbies_3.progress >= goals.goal_hobbies_3.target) {
      goals.goal_hobbies_3.completed = true;
    }
  }

  // 13. goal_hobbies_4: Bountiful Harvest (Target: 1 catnip harvested)
  if (goals.goal_hobbies_4 && !goals.goal_hobbies_4.completed) {
    const catnipHarvested = stats.cropsHarvested?.catnip || 0;
    const hasCatnipInInventory = state.economy.inventory?.['item_crop_catnip']?.provenance === 'earned';
    if (catnipHarvested > 0 || hasCatnipInInventory) {
      goals.goal_hobbies_4.progress = 1;
      goals.goal_hobbies_4.completed = true;
    }
  }

  // 14. goal_business_1: Café Owner (Target: 1)
  if (goals.goal_business_1 && !goals.goal_business_1.completed) {
    if (cafeDetails?.owned && cafeDetails?.isOpen) {
      goals.goal_business_1.progress = 1;
      goals.goal_business_1.completed = true;
    }
  }

  // 15. goal_business_2: Busy Barista (Target: 10 café customers served)
  if (goals.goal_business_2 && !goals.goal_business_2.completed) {
    const servedCount = cafeDetails?.totalOrdersServed || 0;
    goals.goal_business_2.progress = Math.min(goals.goal_business_2.target, servedCount);
    if (goals.goal_business_2.progress >= goals.goal_business_2.target) {
      goals.goal_business_2.completed = true;
    }
  }

  // 16. goal_neighborhood_1: Explorer (Target: 1 visit to neighborhood lot)
  if (goals.goal_neighborhood_1 && !goals.goal_neighborhood_1.completed) {
    let visited = false;
    for (const cat of Object.values(state.cats || {}) as any[]) {
      if (cat.position?.lotId && cat.position.lotId !== 'lot_home') {
        visited = true;
        break;
      }
    }
    const hasTravelEvent = state.events?.some((e: any) =>
      e.type === 'TRAVEL_ARRIVED' || (e.type === 'TRAVEL_COMPLETED' && e.payload?.targetLotId !== 'lot_home')
    );
    if (visited || hasTravelEvent) {
      goals.goal_neighborhood_1.progress = 1;
      goals.goal_neighborhood_1.completed = true;
    }
  }

  // 17. goal_neighborhood_2: Social Butterfly (Target: 3 distinct NPC cats interacted with)
  if (goals.goal_neighborhood_2 && !goals.goal_neighborhood_2.completed) {
    const npcIds = new Set<string>();
    // Check interactions in social subsystem
    if (Array.isArray(state.social?.recentInteractions)) {
      for (const inter of state.social.recentInteractions) {
        if (typeof inter.toId === 'string' && inter.toId.startsWith('npc_')) {
          npcIds.add(inter.toId);
        }
        if (typeof inter.fromId === 'string' && inter.fromId.startsWith('npc_')) {
          npcIds.add(inter.fromId);
        }
      }
    }
    // Check cat relationships with NPCs
    for (const cat of Object.values(state.cats || {}) as any[]) {
      if (cat.relationships) {
        for (const targetId of Object.keys(cat.relationships)) {
          if (targetId.startsWith('npc_')) {
            npcIds.add(targetId);
          }
        }
      }
    }
    // Check events
    if (Array.isArray(state.events)) {
      for (const evt of state.events) {
        for (const actorId of evt.actorIds || []) {
          if (typeof actorId === 'string' && actorId.startsWith('npc_')) {
            npcIds.add(actorId);
          }
        }
      }
    }
    goals.goal_neighborhood_2.progress = Math.min(goals.goal_neighborhood_2.target, npcIds.size);
    if (goals.goal_neighborhood_2.progress >= goals.goal_neighborhood_2.target) {
      goals.goal_neighborhood_2.completed = true;
    }
  }

  // 18. goal_legacy_1: Growing Family (Target: 1 kitten in household)
  if (goals.goal_legacy_1 && !goals.goal_legacy_1.completed) {
    const hasKitten = Object.values(state.cats || {}).some(
      (c: any) => c.lifeStatus === 'living' && (c.lifeStage === 'kitten' || c.motherId || c.fatherId)
    );
    const hasKittenEvent = state.events?.some((e: any) => e.type === 'KITTEN_BORN' || e.type === 'CAT_ADOPTED');
    if (hasKitten || hasKittenEvent) {
      goals.goal_legacy_1.progress = 1;
      goals.goal_legacy_1.completed = true;
    }
  }
}
