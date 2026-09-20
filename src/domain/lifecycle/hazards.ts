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
    let hazardType = health.hazardType || (health.isIll ? 'severe_illness' : 'extreme_neglect');

    // Issue warning if not yet issued
    if (!health.warningIssued) {
      const updatedCat: CatRecord = {
        ...cat,
        health: {
          ...health,
          hasActiveHazard: true,
          hazardType,
          warningIssued: true,
          warningIssuedAtMinute: currentSimMinute,
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
        id: `evt_warn_${catId}_${currentSimMinute}`,
        type: 'HEALTH_WARNING_ISSUED',
        sequence: currentWorld.nextEventSequence++,
        simTime: currentSimMinute,
        actorIds: [catId],
        payload: {
          catId,
          catName: cat.name,
          hazardType,
          warningWindowMinutes: WARNING_WINDOW_MINUTES,
          expiresAtSimMinute: currentSimMinute + WARNING_WINDOW_MINUTES,
        },
      };

      allEvents.push(warningEvent);
      currentWorld.events = [...currentWorld.events, warningEvent];
    } else {
      // Check if warning window has expired
      const onset = health.warningIssuedAtMinute ?? currentSimMinute;
      if (currentSimMinute - onset >= WARNING_WINDOW_MINUTES) {
        // Preventable death triggers
        const causeOfDeath = hazardType;
        const { state: nextState, events: deathEvents } = processCatDeath(
          currentWorld,
          catId,
          causeOfDeath,
          currentSimMinute
        );

        currentWorld = nextState;
        allEvents.push(...deathEvents);
      }
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

  const health = cat.health || {
    isIll: false,
    hasActiveHazard: false,
    warningIssued: false,
  };

  const isNeglected = cat.needs && (cat.needs.hunger <= 0 || cat.needs.energy <= 0);
  if (!health.hasActiveHazard && !health.isIll && !isNeglected) {
    return {
      ok: false,
      state,
      error: { code: 'NO_ACTIVE_HAZARD', message: `Cat ${cat.name} has no active hazard or illness.` },
    };
  }

  // Restore needs if neglected
  const updatedNeeds = { ...cat.needs };
  if (updatedNeeds.hunger <= 0) updatedNeeds.hunger = 50;
  if (updatedNeeds.energy <= 0) updatedNeeds.energy = 50;

  // Clear health hazards
  const updatedCat: CatRecord = {
    ...cat,
    needs: updatedNeeds,
    health: {
      isIll: false,
      hasActiveHazard: false,
      warningIssued: false,
      warningIssuedAtMinute: undefined,
      hazardType: undefined,
      illnessType: undefined,
    },
  };

  const events: DomainEvent[] = [];
  let nextSeq = state.nextEventSequence;

  const recoveryEvent: DomainEvent = {
    id: `evt_intervene_${catId}_${state.clock.simMinute}`,
    type: 'HAZARD_INTERVENED',
    sequence: nextSeq++,
    simTime: state.clock.simMinute,
    actorIds: [catId],
    payload: {
      catId,
      catName: cat.name,
      treatmentType: treatmentType || 'care',
      recoveredAtSimMinute: state.clock.simMinute,
    },
  };
  events.push(recoveryEvent);

  const newState: WorldState = {
    ...state,
    cats: {
      ...state.cats,
      [catId]: updatedCat,
    },
    nextEventSequence: nextSeq,
    events: [...state.events, ...events],
  };

  return { ok: true, state: newState, events };
}
