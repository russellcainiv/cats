/**
 * Collection Dex & Encounter Schedule Engine
 *
 * Owned path: src/domain/collection/engine.ts
 */

import { findCatalogEntry } from '../../content/cats/catalog';
import { CatCategory } from '../../content/cats/types';
import { drawCandidateFromPool, getEligibleCandidates } from './odds';
import {
  CollectionActionResult,
  CollectionDexState,
  DiscoveryContext,
  EncounterState,
  HouseholdCapacityAdapter,
  InjectedRNG,
} from './types';

export const EXPLORATION_COOLDOWN_SIM_MINUTES = 30; // 30 active sim minutes between discovery checks
export const ENCOUNTER_SPAWN_CHANCE_PERCENT = 40; // 40% chance per check if eligible

export function createInitialDexState(): CollectionDexState {
  return {
    version: 1,
    discoveries: {},
    encounters: {},
    lastScheduleCheckSimMinute: 0,
    cooldownUntilSimMinute: 0,
  };
}

/**
 * Process a scheduled exploration check against active simulated time.
 */
export function checkExplorationSchedule(
  state: CollectionDexState,
  context: DiscoveryContext,
  rng: InjectedRNG
): CollectionActionResult {
  // Check cooldown based on active simulation minute
  if (context.simMinute < state.cooldownUntilSimMinute) {
    return {
      success: false,
      actionType: 'SCHEDULE_EXPLORATION_CHECK',
      error: 'Exploration schedule on cooldown',
      state,
    };
  }

  const newState: CollectionDexState = {
    ...state,
    lastScheduleCheckSimMinute: context.simMinute,
    cooldownUntilSimMinute: context.simMinute + EXPLORATION_COOLDOWN_SIM_MINUTES,
  };

  // Roll for spawn chance
  const spawnRoll = rng(1, 100);
  if (spawnRoll > ENCOUNTER_SPAWN_CHANCE_PERCENT) {
    return {
      success: true,
      actionType: 'SCHEDULE_EXPLORATION_CHECK',
      state: newState,
    };
  }

  // Find eligible candidates in current location
  const candidates = getEligibleCandidates(context);
  if (candidates.length === 0) {
    return {
      success: true,
      actionType: 'SCHEDULE_EXPLORATION_CHECK',
      state: newState,
    };
  }

  // Draw candidate using deterministic weighted probability
  const selectedCandidate = drawCandidateFromPool(candidates, rng);
  if (!selectedCandidate) {
    return {
      success: true,
      actionType: 'SCHEDULE_EXPLORATION_CHECK',
      state: newState,
    };
  }

  // Deterministic encounter ID based on catalog ID, location, and sim minute
  const encounterId = `enc_${selectedCandidate.id}_${context.locationId}_${context.simMinute}`;

  // Create or retrieve existing encounter (revisiting retains same phenotype)
  let encounter: EncounterState = newState.encounters[encounterId];
  if (!encounter) {
    encounter = {
      encounterId,
      catalogId: selectedCandidate.id,
      category: selectedCandidate.category,
      gameRarity: selectedCandidate.gameRarity,
      locationId: context.locationId,
      spawnSimMinute: context.simMinute,
      friendshipPoints: 0,
      discovered: true,
      befriended: false,
      recruited: false,
    };
    newState.encounters = {
      ...newState.encounters,
      [encounterId]: encounter,
    };
  }

  // Update Dex discovery record
  const existingDiscovery = newState.discoveries[selectedCandidate.id] || {
    catalogId: selectedCandidate.id,
    firstDiscoveredSimMinute: context.simMinute,
    totalEncounters: 0,
    maxFriendshipAchieved: 0,
    isRecruited: false,
  };

  newState.discoveries = {
    ...newState.discoveries,
    [selectedCandidate.id]: {
      ...existingDiscovery,
      totalEncounters: existingDiscovery.totalEncounters + 1,
    },
  };

  return {
    success: true,
    actionType: 'SCHEDULE_EXPLORATION_CHECK',
    encounter,
    state: newState,
  };
}

/**
 * Increment friendship progress for a known encounter.
 */
export function befriendEncounter(
  state: CollectionDexState,
  encounterId: string,
  points: number,
  simMinute: number
): CollectionActionResult {
  const encounter = state.encounters[encounterId];
  if (!encounter) {
    return {
      success: false,
      actionType: 'BEFRIEND_ENCOUNTER',
      error: 'Encounter not found',
      state,
    };
  }

  const catalogEntry = findCatalogEntry(encounter.catalogId);
  const requiredFriendship = catalogEntry?.eligibleDiscoveryConditions.requiredBefriendLevel || 0;

  const newPoints = Math.min(100, encounter.friendshipPoints + points);
  const isBefriended = newPoints >= requiredFriendship;

  const updatedEncounter: EncounterState = {
    ...encounter,
    friendshipPoints: newPoints,
    befriended: isBefriended,
  };

  const discovery = state.discoveries[encounter.catalogId];
  const updatedDiscovery = discovery
    ? {
        ...discovery,
        maxFriendshipAchieved: Math.max(discovery.maxFriendshipAchieved, newPoints),
      }
    : undefined;

  const newState: CollectionDexState = {
    ...state,
    encounters: {
      ...state.encounters,
      [encounterId]: updatedEncounter,
    },
    discoveries: updatedDiscovery
      ? {
          ...state.discoveries,
          [encounter.catalogId]: updatedDiscovery,
        }
      : state.discoveries,
  };

  return {
    success: true,
    actionType: 'BEFRIEND_ENCOUNTER',
    encounter: updatedEncounter,
    state: newState,
  };
}

/**
 * Recruit encounter into household.
 * Enforces capacity checks (max 8 living/reserved).
 * Ensures exact one serialization execution (atomic).
 */
export function recruitEncounterAdapter(
  state: CollectionDexState,
  encounterId: string,
  actorId: string,
  householdAdapter: HouseholdCapacityAdapter,
  simMinute: number
): CollectionActionResult {
  const encounter = state.encounters[encounterId];
  if (!encounter) {
    return {
      success: false,
      actionType: 'RECRUIT_ENCOUNTER',
      error: 'Encounter not found',
      state,
    };
  }

  // Idempotency / Already recruited check
  if (encounter.recruited) {
    return {
      success: false,
      actionType: 'RECRUIT_ENCOUNTER',
      error: 'Encounter has already been recruited',
      encounter,
      state,
    };
  }

  // Check friendship requirement
  const catalogEntry = findCatalogEntry(encounter.catalogId);
  const requiredPoints = catalogEntry?.eligibleDiscoveryConditions.requiredBefriendLevel || 0;
  if (encounter.friendshipPoints < requiredPoints) {
    return {
      success: false,
      actionType: 'RECRUIT_ENCOUNTER',
      error: `Insufficient friendship level. Required: ${requiredPoints}, Current: ${encounter.friendshipPoints}`,
      encounter,
      state,
    };
  }

  // Enforce household capacity limit (8 living + reserved)
  const availableSlots = householdAdapter.maxCapacity - (householdAdapter.livingCount + householdAdapter.reservedLitterSlots);
  if (availableSlots <= 0) {
    return {
      success: false,
      actionType: 'RECRUIT_ENCOUNTER',
      error: 'Household capacity is full (maximum 8 cats including reserved litter slots)',
      encounter,
      state,
    };
  }

  // Generate canonical cat ID for recruitment
  const newCatId = `cat_recruiter_${encounter.catalogId}_${simMinute}`;

  const updatedEncounter: EncounterState = {
    ...encounter,
    recruited: true,
    recruitedHouseholdId: householdAdapter.householdId,
    recruitedAtSimMinute: simMinute,
  };

  const discovery = state.discoveries[encounter.catalogId];
  const updatedDiscovery = discovery
    ? {
        ...discovery,
        isRecruited: true,
        recruitedCatId: newCatId,
      }
    : undefined;

  const newState: CollectionDexState = {
    ...state,
    encounters: {
      ...state.encounters,
      [encounterId]: updatedEncounter,
    },
    discoveries: updatedDiscovery
      ? {
          ...state.discoveries,
          [encounter.catalogId]: updatedDiscovery,
        }
      : state.discoveries,
  };

  return {
    success: true,
    actionType: 'RECRUIT_ENCOUNTER',
    encounter: updatedEncounter,
    newCatId,
    state: newState,
  };
}

/**
 * Validate that rare wild/fantasy discovery cannot be bypassed via Creator / Genetic adapter.
 */
export function validateCreatorBreedAllowed(catalogId: string): { allowed: boolean; reason?: string } {
  const entry = findCatalogEntry(catalogId);
  if (!entry) {
    return { allowed: false, reason: 'Unknown catalog ID' };
  }

  if (!entry.creatorAllowed || entry.category === 'wild' || entry.category === 'fantasy') {
    return {
      allowed: false,
      reason: `Rare ${entry.category} cat form '${entry.displayName}' cannot be created in Cat Creator or spawned via genetic novelty. It must be discovered in the wild.`,
    };
  }

  return { allowed: true };
}
