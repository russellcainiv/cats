// src/domain/lifecycle/ghosts.ts
// Memorial placement and seeded night-time ghost visits projection logic.

import {
  WorldState,
  MemorialRecord,
  GhostProjection,
  CommandContext,
  CommandResult,
  DomainEvent,
  LifecycleCommand,
} from './types';

import { nextRng } from './rng';

export const GHOST_VISIT_DURATION_MINUTES = 180; // 3 sim hours ghost visit duration
export const GHOST_CHANCE = 0.3; // 30% chance per night per memorial

/**
 * Executes PLACE_MEMORIAL command: updates the position of a tombstone/memorial on a lot.
 */
export function executePlaceMemorial(
  state: WorldState,
  command: Extract<LifecycleCommand, { type: 'PLACE_MEMORIAL' }>,
  context: CommandContext
): CommandResult {
  const { deceasedCatId, lotId, x, y } = command.payload;

  // Find memorial matching deceasedCatId
  const memorials = state.lifecycle.memorials;
  const memorial = Object.values(memorials).find(m => m.deceasedCatId === deceasedCatId);

  if (!memorial) {
    return {
      ok: false,
      state,
      error: { code: 'MEMORIAL_NOT_FOUND', message: `No memorial found for deceased cat ${deceasedCatId}.` },
    };
  }

  const updatedMemorial: MemorialRecord = {
    ...memorial,
    tombstonePosition: { lotId, x, y },
  };

  const events: DomainEvent[] = [];
  let nextSeq = state.nextEventSequence;

  const event: DomainEvent = {
    id: `evt_place_mem_${memorial.id}_${state.clock.simMinute}`,
    type: 'MEMORIAL_PLACED',
    sequence: nextSeq++,
    simTime: state.clock.simMinute,
    actorIds: [deceasedCatId],
    payload: {
      memorialId: memorial.id,
      deceasedCatId,
      position: { lotId, x, y },
    },
  };
  events.push(event);

  const newState: WorldState = {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      memorials: {
        ...memorials,
        [memorial.id]: updatedMemorial,
      },
    },
    nextEventSequence: nextSeq,
    events: [...state.events, ...events],
  };

  return { ok: true, state: newState, events };
}

/**
 * Executes DISMISS_GHOST command: removes a ghost projection from active world state.
 */
export function executeDismissGhost(
  state: WorldState,
  command: Extract<LifecycleCommand, { type: 'DISMISS_GHOST' }>,
  context: CommandContext
): CommandResult {
  const { memorialId } = command.payload;

  const ghosts = state.lifecycle.ghosts;
  const existingGhost = ghosts.find(g => g.memorialId === memorialId);

  if (!existingGhost) {
    return {
      ok: false,
      state,
      error: { code: 'GHOST_NOT_ACTIVE', message: `No active ghost projection found for memorial ${memorialId}.` },
    };
  }

  const updatedGhosts = ghosts.filter(g => g.memorialId !== memorialId);
  const events: DomainEvent[] = [];
  let nextSeq = state.nextEventSequence;

  const event: DomainEvent = {
    id: `evt_dismiss_ghost_${memorialId}_${state.clock.simMinute}`,
    type: 'GHOST_DISMISSED',
    sequence: nextSeq++,
    simTime: state.clock.simMinute,
    actorIds: [existingGhost.deceasedCatId],
    payload: {
      memorialId,
      deceasedCatId: existingGhost.deceasedCatId,
    },
  };
  events.push(event);

  const newState: WorldState = {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      ghosts: updatedGhosts,
    },
    nextEventSequence: nextSeq,
    events: [...state.events, ...events],
  };

  return { ok: true, state: newState, events };
}

/**
 * Processes ghost visit expirations and night-time ghost visit spawns.
 * Uses seeded RNG check once per simulation night (simMinute % 1440 === 0).
 * Ghosts are projections ONLY and NEVER consume living capacity or resurrect cats.
 */
export function processGhostTick(
  state: WorldState,
  elapsedSimMinutes: number
): { state: WorldState; events: DomainEvent[] } {
  if (state.clock.isPaused || elapsedSimMinutes <= 0) {
    return { state, events: [] };
  }

  let currentWorld = { ...state };
  const allEvents: DomainEvent[] = [];
  const currentSimMinute = currentWorld.clock.simMinute;

  // 1. Expire past ghost projections
  const activeGhosts = currentWorld.lifecycle.ghosts.filter(g => g.expiresAtSimMinute > currentSimMinute);

  if (activeGhosts.length !== currentWorld.lifecycle.ghosts.length) {
    currentWorld = {
      ...currentWorld,
      lifecycle: {
        ...currentWorld.lifecycle,
        ghosts: activeGhosts,
      },
    };
  }

  // 2. Night transition check (e.g., at midnight, minute % 1440 === 0 or day boundary)
  const currentNight = Math.floor(currentSimMinute / 1440);
  const lastCheckNight = currentWorld.lifecycle.lastGhostCheckNight ?? -1;

  if (currentNight > lastCheckNight && currentSimMinute % 1440 < elapsedSimMinutes) {
    // Night transition! Check each memorial for seeded ghost visit
    let currentRng = currentWorld.rng;
    const updatedMemorials = { ...currentWorld.lifecycle.memorials };
    const memorials = Object.values(updatedMemorials);
    const newGhosts = [...currentWorld.lifecycle.ghosts];

    for (const mem of memorials) {
      // Don't spawn if ghost projection already active for this memorial
      if (newGhosts.some(g => g.memorialId === mem.id)) continue;

      let val: number;
      [val, currentRng] = nextRng(currentRng, 'ghost_spawn', currentSimMinute);

      if (val < GHOST_CHANCE) {
        // Spawn ghost visit projection
        const expiresAt = currentSimMinute + GHOST_VISIT_DURATION_MINUTES;
        const ghostProj: GhostProjection = {
          memorialId: mem.id,
          deceasedCatId: mem.deceasedCatId,
          name: mem.catName,
          appearance: mem.appearance,
          position: {
            lotId: mem.tombstonePosition.lotId,
            x: mem.tombstonePosition.x,
            y: mem.tombstonePosition.y,
          },
          expiresAtSimMinute: expiresAt,
        };

        newGhosts.push(ghostProj);

        // Record ghost visit on memorial immutably without mutating mem in-place
        updatedMemorials[mem.id] = {
          ...mem,
          ghostVisits: [
            ...(mem.ghostVisits || []),
            {
              simMinute: currentSimMinute,
              durationMinutes: GHOST_VISIT_DURATION_MINUTES,
            },
          ],
        };

        const ghostEvent: DomainEvent = {
          id: `evt_ghost_visit_${mem.id}_${currentSimMinute}`,
          type: 'GHOST_VISITED',
          sequence: currentWorld.nextEventSequence++,
          simTime: currentSimMinute,
          actorIds: [mem.deceasedCatId],
          payload: {
            memorialId: mem.id,
            deceasedCatId: mem.deceasedCatId,
            catName: mem.catName,
            expiresAtSimMinute: expiresAt,
          },
        };

        allEvents.push(ghostEvent);
        currentWorld.events = [...currentWorld.events, ghostEvent];
      }
    }

    currentWorld = {
      ...currentWorld,
      rng: currentRng,
      lifecycle: {
        ...currentWorld.lifecycle,
        memorials: updatedMemorials,
        ghosts: newGhosts,
        lastGhostCheckNight: currentNight,
      },
    };
  }

  return { state: currentWorld, events: allEvents };
}
