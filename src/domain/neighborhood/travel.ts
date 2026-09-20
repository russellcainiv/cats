import {
  WorldState,
  CatId,
  LotId,
  CommandContext,
  CommandResult,
  TravelJourney,
  DomainEvent,
} from './types';

export const TRAVEL_DURATION_MINUTES = 10;

/**
 * Validates travel conditions and starts a travel journey for a cat.
 */
export function startTravel(
  state: WorldState,
  catId: CatId,
  targetLotId: LotId,
  context: CommandContext,
  isReturn = false
): CommandResult {
  if (!catId || typeof catId !== 'string' || !catId.trim()) {
    return {
      ok: false,
      state,
      error: { code: 'INVALID_CAT_ID', message: 'Cat ID must be a non-empty string.' },
    };
  }

  if (!targetLotId || typeof targetLotId !== 'string' || !targetLotId.trim()) {
    return {
      ok: false,
      state,
      error: { code: 'INVALID_LOT', message: 'Destination lot ID must be a non-empty string.' },
    };
  }

  // 1. Locate the cat (household or NPC)
  const isHouseholdCat = state.livingCatIds.includes(catId);
  const cat = isHouseholdCat
    ? state.cats[catId]
    : state.neighborhood.npcCats[catId];

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
      error: {
        code: 'CAT_NOT_LIVING',
        message: `Deceased or ghost cat ${catId} cannot travel.`,
      },
    };
  }

  // 2. Validate destination lot
  const targetLot = state.neighborhood.lots[targetLotId];
  if (!targetLot) {
    return {
      ok: false,
      state,
      error: {
        code: 'INVALID_LOT',
        message: `Destination lot ${targetLotId} does not exist.`,
      },
    };
  }

  if (cat.position.lotId === targetLotId) {
    return {
      ok: false,
      state,
      error: {
        code: 'ALREADY_AT_DESTINATION',
        message: `Cat ${catId} is already at lot ${targetLotId}.`,
      },
    };
  }

  // Check opening/closing hours for shop/cafe
  const currentHour = Math.floor((state.clock.simMinute % 1440) / 60);
  if (
    targetLot.openingHour !== undefined &&
    targetLot.closingHour !== undefined
  ) {
    if (
      currentHour < targetLot.openingHour ||
      currentHour >= targetLot.closingHour
    ) {
      return {
        ok: false,
        state,
        error: {
          code: 'LOT_CLOSED',
          message: `${targetLot.name} is currently closed (Hours: ${targetLot.openingHour}:00 - ${targetLot.closingHour}:00, Current: ${currentHour}:00).`,
        },
      };
    }
  }

  // Prevent multiple simultaneous travels for same cat
  if (state.neighborhood.activeTravels[catId]) {
    return {
      ok: false,
      state,
      error: {
        code: 'ALREADY_TRAVELING',
        message: `Cat ${catId} is already traveling.`,
      },
    };
  }

  // 3. Construct journey
  const journey: TravelJourney = {
    catId,
    originLotId: cat.position.lotId,
    targetLotId,
    startSimMinute: state.clock.simMinute,
    durationMinutes: TRAVEL_DURATION_MINUTES,
    elapsedMinutes: 0,
    isReturn,
  };

  const updatedActiveTravels = {
    ...state.neighborhood.activeTravels,
    [catId]: journey,
  };

  // Update cat's current action to traveling
  const updatedAction = {
    type: 'traveling',
    targetLotId,
    durationMinutes: TRAVEL_DURATION_MINUTES,
    elapsedMinutes: 0,
  };

  let updatedCats = state.cats;
  let updatedNpcCats = state.neighborhood.npcCats;

  if (isHouseholdCat) {
    updatedCats = {
      ...state.cats,
      [catId]: {
        ...cat,
        currentAction: updatedAction,
      },
    };
  } else {
    updatedNpcCats = {
      ...state.neighborhood.npcCats,
      [catId]: {
        ...cat,
        currentAction: updatedAction,
      },
    };
  }

  const travelEvent: DomainEvent = {
    id: `evt_travel_start_${state.nextEventSequence}`,
    type: 'CAT_TRAVEL_STARTED',
    sequence: state.nextEventSequence,
    simTime: state.clock.simMinute,
    actorIds: [catId],
    payload: {
      catId,
      originLotId: journey.originLotId,
      targetLotId,
      durationMinutes: TRAVEL_DURATION_MINUTES,
    },
  };

  const newState: WorldState = {
    ...state,
    cats: updatedCats,
    neighborhood: {
      ...state.neighborhood,
      npcCats: updatedNpcCats,
      activeTravels: updatedActiveTravels,
    },
    events: [...state.events, travelEvent],
    nextEventSequence: state.nextEventSequence + 1,
  };

  return { ok: true, state: newState, events: [travelEvent] };
}

/**
 * Cancels an in-flight travel journey, safely returning the cat to its origin.
 */
export function cancelTravel(
  state: WorldState,
  catId: CatId,
  context: CommandContext
): CommandResult {
  if (!catId || typeof catId !== 'string' || !catId.trim()) {
    return {
      ok: false,
      state,
      error: { code: 'INVALID_CAT_ID', message: 'Cat ID must be a non-empty string.' },
    };
  }

  const journey = state.neighborhood.activeTravels[catId];
  if (!journey) {
    return {
      ok: false,
      state,
      error: {
        code: 'NOT_TRAVELING',
        message: `Cat ${catId} is not currently traveling.`,
      },
    };
  }

  const nextActiveTravels = { ...state.neighborhood.activeTravels };
  delete nextActiveTravels[catId];

  const isHouseholdCat = state.livingCatIds.includes(catId);
  let updatedCats = state.cats;
  let updatedNpcCats = state.neighborhood.npcCats;

  if (isHouseholdCat && state.cats[catId]) {
    updatedCats = {
      ...state.cats,
      [catId]: {
        ...state.cats[catId],
        currentAction: null,
        position: {
          lotId: journey.originLotId,
          x: state.cats[catId].position.x,
          y: state.cats[catId].position.y,
        },
      },
    };
  } else if (state.neighborhood.npcCats[catId]) {
    updatedNpcCats = {
      ...state.neighborhood.npcCats,
      [catId]: {
        ...state.neighborhood.npcCats[catId],
        currentAction: null,
        position: {
          lotId: journey.originLotId,
          x: state.neighborhood.npcCats[catId].position.x,
          y: state.neighborhood.npcCats[catId].position.y,
        },
      },
    };
  }

  const cancelEvent: DomainEvent = {
    id: `evt_travel_cancel_${state.nextEventSequence}`,
    type: 'CAT_TRAVEL_CANCELED',
    sequence: state.nextEventSequence,
    simTime: state.clock.simMinute,
    actorIds: [catId],
    payload: {
      catId,
      returnedToLotId: journey.originLotId,
    },
  };

  const newState: WorldState = {
    ...state,
    cats: updatedCats,
    neighborhood: {
      ...state.neighborhood,
      npcCats: updatedNpcCats,
      activeTravels: nextActiveTravels,
    },
    events: [...state.events, cancelEvent],
    nextEventSequence: state.nextEventSequence + 1,
  };

  return { ok: true, state: newState, events: [cancelEvent] };
}

/**
 * Advances active travel journeys and NPC schedule routines for elapsed sim minutes.
 */
export function advanceTravelsAndNpcs(
  state: WorldState,
  elapsedSimMinutes: number
): WorldState {
  if (elapsedSimMinutes <= 0) return state;

  let currentState = state;
  const currentSimMinute = currentState.clock.simMinute;
  const currentHour = Math.floor((currentSimMinute % 1440) / 60);

  // 1. Advance active travel journeys
  const activeTravels = { ...currentState.neighborhood.activeTravels };
  let updatedCats = { ...currentState.cats };
  let updatedNpcCats = { ...currentState.neighborhood.npcCats };
  const newEvents: DomainEvent[] = [];
  let seq = currentState.nextEventSequence;

  for (const catId of Object.keys(activeTravels)) {
    const journey = { ...activeTravels[catId] };
    journey.elapsedMinutes += elapsedSimMinutes;

    const isHouseholdCat = currentState.livingCatIds.includes(catId);
    const cat = isHouseholdCat ? updatedCats[catId] : updatedNpcCats[catId];

    if (!cat) continue;

    // Decay needs during travel
    const needs = { ...cat.needs };
    needs.hunger = Math.max(0, needs.hunger - 0.08 * elapsedSimMinutes);
    needs.energy = Math.max(0, needs.energy - 0.06 * elapsedSimMinutes);
    needs.hygiene = Math.max(0, needs.hygiene - 0.04 * elapsedSimMinutes);

    if (journey.elapsedMinutes >= journey.durationMinutes) {
      // Arrived at destination lot
      delete activeTravels[catId];

      const arrivedCat = {
        ...cat,
        needs,
        position: {
          lotId: journey.targetLotId,
          x: 5,
          y: 5, // Entrance spawn position
        },
        currentAction: null,
      };

      if (isHouseholdCat) {
        updatedCats[catId] = arrivedCat;
      } else {
        updatedNpcCats[catId] = arrivedCat;
      }

      const arrEvt: DomainEvent = {
        id: `evt_travel_arrived_${seq++}`,
        type: 'CAT_TRAVEL_ARRIVED',
        sequence: seq - 1,
        simTime: currentSimMinute,
        actorIds: [catId],
        payload: {
          catId,
          arrivedAtLotId: journey.targetLotId,
        },
      };
      newEvents.push(arrEvt);
    } else {
      // Journey in progress
      activeTravels[catId] = journey;
      const updatedCat = { ...cat, needs };
      if (isHouseholdCat) {
        updatedCats[catId] = updatedCat;
      } else {
        updatedNpcCats[catId] = updatedCat;
      }
    }
  }

  currentState = {
    ...currentState,
    cats: updatedCats,
    neighborhood: {
      ...currentState.neighborhood,
      npcCats: updatedNpcCats,
      activeTravels,
    },
    events: [...currentState.events, ...newEvents],
    nextEventSequence: seq,
  };

  // 2. Advance NPC schedule routines & autonomies
  const npcsToEvaluate = Object.keys(currentState.neighborhood.npcCats);

  for (const npcId of npcsToEvaluate) {
    const npc = currentState.neighborhood.npcCats[npcId];
    if (!npc || npc.lifeStatus !== 'living' || currentState.neighborhood.activeTravels[npcId]) {
      continue;
    }

    // Decay needs for non-traveling NPCs
    const needs = { ...npc.needs };
    needs.hunger = Math.max(0, needs.hunger - 0.08 * elapsedSimMinutes);
    needs.energy = Math.max(0, needs.energy - 0.06 * elapsedSimMinutes);
    needs.hygiene = Math.max(0, needs.hygiene - 0.04 * elapsedSimMinutes);

    currentState = {
      ...currentState,
      neighborhood: {
        ...currentState.neighborhood,
        npcCats: {
          ...currentState.neighborhood.npcCats,
          [npcId]: { ...npc, needs },
        },
      },
    };

    // Evaluate NPC schedule for target lot
    if (npc.npcSchedule) {
      const scheduleSlot = npc.npcSchedule.find(
        s => currentHour >= s.startHour && currentHour < s.endHour
      );

      if (scheduleSlot && scheduleSlot.lotId !== npc.position.lotId) {
        // Start travel to scheduled lot if lot is open
        const targetLot = currentState.neighborhood.lots[scheduleSlot.lotId];
        const isOpen =
          !targetLot ||
          targetLot.openingHour === undefined ||
          (currentHour >= targetLot.openingHour && currentHour < targetLot.closingHour!);

        if (isOpen) {
          const travelRes = startTravel(
            currentState,
            npcId,
            scheduleSlot.lotId,
            { actorId: npcId, commandId: `npc_sched_${seq++}` }
          );
          if (travelRes.ok) {
            currentState = travelRes.state;
          }
        }
      }
    }
  }

  return currentState;
}
