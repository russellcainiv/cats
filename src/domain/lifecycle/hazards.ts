// src/domain/lifecycle/hazards.ts
// Illness, neglect, hazard warnings, treatment intervention windows, and preventable death transitions.

import {
  WorldState,
  CatRecord,
  DomainEvent,
  CommandContext,
  CommandResult,
  LifecycleCommand,
} from './types';

import { processCatDeath } from './aging';

export const WARNING_WINDOW_MINUTES = 120; // 2 sim hours warning window before preventable death

/**
 * Checks for hazards/neglect/illness on living cats, issues warning events,
 * and triggers preventable death if warning window expires without intervention.
 * Invariant to batching: evaluates onset and expiration relative to elapsed sim interval.
 */
export function processHazardsTick(
  state: WorldState,
  elapsedSimMinutes: number
): { state: WorldState; events: DomainEvent[] } {
  if (state.clock.isPaused || elapsedSimMinutes <= 0) {
    return { state, events: [] };
  }

  let currentWorld = { ...state };
  const allEvents: DomainEvent[] = [];
  const currentSimMinute = currentWorld.clock.simMinute;

  const livingIds = [...currentWorld.livingCatIds];

  for (const catId of livingIds) {
    const cat = currentWorld.cats[catId];
    if (!cat || cat.lifeStatus !== 'living') continue;

    const health = cat.health || {
      isIll: false,
      hasActiveHazard: false,
      warningIssued: false,
    };

    // Check for severe neglect condition: hunger === 0 or energy === 0
    const isNeglected = cat.needs && (cat.needs.hunger <= 0 || cat.needs.energy <= 0);
    const hasHazard = health.hasActiveHazard || health.isIll || isNeglected;

    if (!hasHazard) {
      // Clear warning if condition was previously active but resolved
      if (health.warningIssued) {
        const updatedCat: CatRecord = {
          ...cat,
          health: {
            ...health,
            warningIssued: false,
            warningIssuedAtMinute: undefined,
          },
        };
        currentWorld = {
          ...currentWorld,
          cats: {
            ...currentWorld.cats,
            [catId]: updatedCat,
          },
        };
      }
      continue;
    }

    // Determine hazard category
    const hazardType = health.hazardType || (health.isIll ? 'severe_illness' : 'extreme_neglect');

    // Onset timestamp is invariant to caller batching: onset begins at start of elapsed step if newly detected
    let warningOnsetMinute = health.warningIssuedAtMinute;
    if (warningOnsetMinute === undefined) {
      warningOnsetMinute = Math.max(0, currentSimMinute - elapsedSimMinutes);
    }

    // Issue warning if not yet issued
    if (!health.warningIssued) {
      const updatedCat: CatRecord = {
        ...cat,
        health: {
          ...health,
          hasActiveHazard: true,
          hazardType,
          warningIssued: true,
          warningIssuedAtMinute: warningOnsetMinute,
        },
      };

      currentWorld = {
        ...currentWorld,
        cats: {
          ...currentWorld.cats,
          [catId]: updatedCat,
        },
      };

      const warningEvent: DomainEvent = {
        id: `evt_warn_${catId}_${warningOnsetMinute}`,
        type: 'HEALTH_WARNING_ISSUED',
        sequence: currentWorld.nextEventSequence++,
        simTime: warningOnsetMinute,
        actorIds: [catId],
        payload: {
          catId,
          catName: cat.name,
          hazardType,
          warningWindowMinutes: WARNING_WINDOW_MINUTES,
          expiresAtSimMinute: warningOnsetMinute + WARNING_WINDOW_MINUTES,
        },
      };

      allEvents.push(warningEvent);
      currentWorld.events = [...currentWorld.events, warningEvent];
    }

    // Check if warning window has expired (evaluated deterministically)
    if (currentSimMinute - warningOnsetMinute >= WARNING_WINDOW_MINUTES) {
      const deathMinute = warningOnsetMinute + WARNING_WINDOW_MINUTES;
      const causeOfDeath = hazardType;
      const { state: nextState, events: deathEvents } = processCatDeath(
        currentWorld,
        catId,
        causeOfDeath,
        deathMinute
      );

      currentWorld = nextState;
      allEvents.push(...deathEvents);
    }
  }

  return { state: currentWorld, events: allEvents };
}

/**
 * Handles INTERVENE_HAZARD command: cures illness, saves cat from active hazard/neglect,
 * resets warnings, and emits recovery events.
 */
export function executeHazardIntervention(
  state: WorldState,
  command: Extract<LifecycleCommand, { type: 'INTERVENE_HAZARD' }>,
  context: CommandContext
): CommandResult {
  const { catId, treatmentType } = command.payload;
  const cat = state.cats[catId];

  if (!cat) {
    return {
      ok: false,
      state,
      error: { code: 'CAT_NOT_FOUND', message: `Cat ${catId} does not exist.` },
    };
  }

  if (cat.lifeStatus !== 'living') {
    return {
      ok: false,
      state,
      error: { code: 'CAT_NOT_ALIVE', message: `Cat ${cat.name} is not alive.` },
    };
  }

  const health = cat.health;
  if (!health?.hasActiveHazard && !health?.isIll && cat.needs?.hunger > 0 && cat.needs?.energy > 0) {
    return {
      ok: false,
      state,
      error: { code: 'NO_ACTIVE_HAZARD', message: `Cat ${cat.name} has no active hazard or life-threatening illness.` },
    };
  }

  // Restore needs and clear hazard
  const updatedCat: CatRecord = {
    ...cat,
    needs: {
      ...cat.needs,
      hunger: Math.max(cat.needs.hunger, 50),
      energy: Math.max(cat.needs.energy, 50),
      health: 80,
    },
    health: {
      isIll: false,
      hasActiveHazard: false,
      warningIssued: false,
      warningIssuedAtMinute: undefined,
    },
  };

  const updatedCats = {
    ...state.cats,
    [catId]: updatedCat,
  };

  const recoveryEvent: DomainEvent = {
    id: `evt_recover_${catId}_${state.clock.simMinute}`,
    type: 'HAZARD_INTERVENED',
    sequence: state.nextEventSequence,
    simTime: state.clock.simMinute,
    actorIds: [catId],
    payload: {
      catId,
      catName: cat.name,
      treatmentType: treatmentType || 'general_care',
      recoveredAtSimMinute: state.clock.simMinute,
    },
  };

  const newState: WorldState = {
    ...state,
    cats: updatedCats,
    nextEventSequence: state.nextEventSequence + 1,
    events: [...state.events, recoveryEvent],
  };

  return { ok: true, state: newState, events: [recoveryEvent] };
}
