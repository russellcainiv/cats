/**
 * Atomic Command Protocol and Dispatch Pipeline
 */

import { createCatRecord, validateCatName } from './core/cat';
import { createDomainEvent } from './core/events';
import { appendReceipt, createReceipt, findReceipt } from './core/idempotency';
import { findPath } from './core/navigation';
import { handleSubsystemCommand } from './core/subsystems';
import { assertInvariants } from './invariants';
import { SeededRng } from './rng';
import {
  calculateAvailableCapacity,
  CatAppearance,
  CatId,
  CatRecord,
  DomainEvent,
  GridCell,
  LotId,
  MAX_LIVING_CATS_CAPACITY,
  MemorialId,
  ObjectId,
  PersonalityTrait,
  PregnancyId,
  WorldState,
} from './state';

export type GameCommand =
  // Core Commands
  | { type: 'CREATE_CAT'; payload: { name: string; appearance: CatAppearance; traits: PersonalityTrait[] } }
  | { type: 'SELECT_CAT'; payload: { catId: CatId | null } }
  | { type: 'MOVE_CAT'; payload: { catId: CatId; target: GridCell } }
  | { type: 'CANCEL_ACTION'; payload: { catId: CatId } }
  | {
      type: 'DIRECT_CARE';
      payload: {
        catId: CatId;
        actionType: 'eat' | 'sleep' | 'litter' | 'groom' | 'scratch' | 'play';
        targetObjectId?: ObjectId;
      };
    }
  | { type: 'SET_SIMULATION_PAUSE'; payload: { paused: boolean } }
  | { type: 'RENAME_HOUSEHOLD'; payload: { name: string } }
  | { type: 'ADOPT_CAT'; payload: { name: string; appearance: CatAppearance; traits: PersonalityTrait[] } }

  // Subsystem Commands
  | { type: 'BUILD_WALL'; payload: { lotId: LotId; x1: number; y1: number; x2: number; y2: number } }
  | { type: 'REMOVE_WALL'; payload: { lotId: LotId; wallId: string } }
  | { type: 'PLACE_OBJECT'; payload: { lotId: LotId; catalogId: string; x: number; y: number } }
  | { type: 'MOVE_OBJECT'; payload: { lotId: LotId; objectId: ObjectId; x: number; y: number } }
  | { type: 'REMOVE_OBJECT'; payload: { lotId: LotId; objectId: ObjectId } }
  | { type: 'ENTER_FREE_BUILD'; payload: Record<string, never> }
  | { type: 'COMMIT_FREE_BUILD'; payload: Record<string, never> }
  | { type: 'CANCEL_FREE_BUILD'; payload: Record<string, never> }

  // Social / Romance
  | {
      type: 'SOCIAL_INTERACT';
      payload: {
        initiatorId: CatId;
        targetId: CatId;
        interactionType: 'sniff' | 'nuzzle' | 'play_chase' | 'hiss';
      };
    }
  | { type: 'SUGGEST_MOO_MOO'; payload: { initiatorId: CatId; partnerId: CatId } }

  // Economy
  | { type: 'BUY_ITEM'; payload: { catalogId: string; quantity: number } }
  | { type: 'SELL_ITEM'; payload: { itemId: string; quantity: number } }
  | { type: 'HARVEST_CROP'; payload: { gardenPlotId: ObjectId } }
  | { type: 'PLANT_CROP'; payload: { gardenPlotId: ObjectId; cropType: 'tomato' | 'strawberry' | 'catnip' } }
  | { type: 'RESTOCK_CAFE'; payload: { recipeId: string; amount: number } }

  // Neighborhood
  | { type: 'TRAVEL_TO_LOT'; payload: { catId: CatId; targetLotId: LotId } }
  | { type: 'RETURN_HOME'; payload: { catId: CatId } }

  // Lifecycle
  | { type: 'TRIGGER_BIRTH'; payload: { pregnancyId: PregnancyId } }
  | { type: 'INTERVENE_HAZARD'; payload: { catId: CatId } }
  | { type: 'PLACE_MEMORIAL'; payload: { deceasedCatId: CatId; lotId: LotId; x: number; y: number } }
  | { type: 'DISMISS_GHOST'; payload: { memorialId: MemorialId } };

export interface CommandContext {
  actorId: string;
  commandId: string;
  timestamp?: number;
}

export type CommandResult =
  | { ok: true; state: WorldState; events: DomainEvent[] }
  | { ok: false; state: WorldState; error: { code: string; message: string } };

export function dispatch(
  state: WorldState,
  command: GameCommand,
  context: CommandContext
): CommandResult {
  // 1. Idempotency Check: Return previously processed result without re-executing
  const existingReceipt = findReceipt(state.commandReceipts, context.commandId);
  if (existingReceipt) {
    if (existingReceipt.success) {
      return {
        ok: true,
        state,
        events: [],
      };
    } else {
      return {
        ok: false,
        state,
        error: { code: 'DUPLICATE_COMMAND_FAILED', message: 'Command previously failed' },
      };
    }
  }

  // Restore RNG from state
  const rng = SeededRng.deserialize(state.rng.serializedState || { seed: state.rng.seed, state: state.rng.seed, drawCount: state.rng.counter, history: [] });

  let nextState = { ...state };
  const events: DomainEvent[] = [];

  try {
    switch (command.type) {
      case 'CREATE_CAT': {
        const available = calculateAvailableCapacity(state);
        if (available <= 0 || state.livingCatIds.length >= MAX_LIVING_CATS_CAPACITY) {
          return {
            ok: false,
            state,
            error: {
              code: 'CAPACITY_EXCEEDED',
              message: `Cannot create cat: maximum capacity of ${MAX_LIVING_CATS_CAPACITY} reached`,
            },
          };
        }

        const { valid, error, trimmedName } = validateCatName(command.payload.name);
        if (!valid) {
          return {
            ok: false,
            state,
            error: { code: 'INVALID_NAME', message: error || 'Invalid cat name' },
          };
        }

        const newCat = createCatRecord({
          householdId: state.householdId,
          name: trimmedName,
          appearance: command.payload.appearance,
          traits: command.payload.traits,
          createdAtSimMinute: state.clock.simMinute,
        });

        nextState = {
          ...nextState,
          livingCatIds: [...nextState.livingCatIds, newCat.id],
          cats: { ...nextState.cats, [newCat.id]: newCat },
          selectedCatId: nextState.selectedCatId ?? newCat.id,
        };

        const evt = createDomainEvent(
          'CAT_CREATED',
          [newCat.id],
          { catId: newCat.id, name: newCat.name },
          state.clock.simMinute,
          nextState.nextEventSequence++
        );
        events.push(evt);
        break;
      }

      case 'SELECT_CAT': {
        const catId = command.payload.catId;
        if (catId !== null && !state.cats[catId]) {
          return {
            ok: false,
            state,
            error: { code: 'CAT_NOT_FOUND', message: `Cat ${catId} not found` },
          };
        }

        nextState = {
          ...nextState,
          selectedCatId: catId,
        };

        const evt = createDomainEvent(
          'CAT_SELECTED',
          catId ? [catId] : [],
          { selectedCatId: catId },
          state.clock.simMinute,
          nextState.nextEventSequence++
        );
        events.push(evt);
        break;
      }

      case 'MOVE_CAT': {
        const { catId, target } = command.payload;
        const cat = state.cats[catId];
        if (!cat || cat.lifeStatus !== 'living') {
          return {
            ok: false,
            state,
            error: { code: 'CAT_NOT_FOUND', message: 'Cat not found or deceased' },
          };
        }

        const lot = state.building.lots[cat.position.lotId];
        if (!lot) {
          return {
            ok: false,
            state,
            error: { code: 'LOT_NOT_FOUND', message: 'Current lot not found' },
          };
        }

        const pathResult = findPath(lot, { x: cat.position.x, y: cat.position.y }, target);
        if (!pathResult.reachable) {
          return {
            ok: false,
            state,
            error: {
              code: 'UNREACHABLE_PATH',
              message: pathResult.error || 'Destination cell is unreachable or blocked',
            },
          };
        }

        const updatedCat: CatRecord = {
          ...cat,
          lastRoute: pathResult.route,
          currentAction: {
            id: `act_move_${Date.now()}`,
            type: 'move',
            targetPosition: target,
            durationMinutes: Math.max(1, pathResult.route.length - 1),
            elapsedMinutes: 0,
            isInterruptible: true,
            autonomous: false,
            payload: { route: pathResult.route },
          },
        };

        nextState = {
          ...nextState,
          cats: { ...nextState.cats, [catId]: updatedCat },
        };

        const evt = createDomainEvent(
          'CAT_MOVE_ORDERED',
          [catId],
          { target, routeLength: pathResult.route.length },
          state.clock.simMinute,
          nextState.nextEventSequence++
        );
        events.push(evt);
        break;
      }

      case 'CANCEL_ACTION': {
        const { catId } = command.payload;
        const cat = state.cats[catId];
        if (!cat) {
          return {
            ok: false,
            state,
            error: { code: 'CAT_NOT_FOUND', message: 'Cat not found' },
          };
        }

        const updatedCat: CatRecord = {
          ...cat,
          currentAction: null,
          actionQueue: [],
          lastRoute: [],
        };

        nextState = {
          ...nextState,
          cats: { ...nextState.cats, [catId]: updatedCat },
        };

        const evt = createDomainEvent(
          'ACTION_CANCELLED',
          [catId],
          {},
          state.clock.simMinute,
          nextState.nextEventSequence++
        );
        events.push(evt);
        break;
      }

      case 'DIRECT_CARE': {
        const { catId, actionType, targetObjectId } = command.payload;
        const cat = state.cats[catId];
        if (!cat || cat.lifeStatus !== 'living') {
          return {
            ok: false,
            state,
            error: { code: 'CAT_NOT_FOUND', message: 'Cat not found or deceased' },
          };
        }

        const actionItem = {
          id: `act_${actionType}_${Date.now()}`,
          type: actionType,
          targetId: targetObjectId,
          durationMinutes: 3,
          elapsedMinutes: 0,
          isInterruptible: true,
          autonomous: false,
        };

        const updatedCat: CatRecord = {
          ...cat,
          currentAction: actionItem,
        };

        nextState = {
          ...nextState,
          cats: { ...nextState.cats, [catId]: updatedCat },
        };

        const evt = createDomainEvent(
          'CARE_DIRECTED',
          [catId],
          { actionType, targetObjectId },
          state.clock.simMinute,
          nextState.nextEventSequence++
        );
        events.push(evt);
        break;
      }

      case 'SET_SIMULATION_PAUSE': {
        nextState = {
          ...nextState,
          clock: {
            ...nextState.clock,
            isPaused: command.payload.paused,
          },
        };

        const evt = createDomainEvent(
          command.payload.paused ? 'SIMULATION_PAUSED' : 'SIMULATION_RESUMED',
          [],
          { isPaused: command.payload.paused },
          state.clock.simMinute,
          nextState.nextEventSequence++
        );
        events.push(evt);
        break;
      }

      case 'RENAME_HOUSEHOLD': {
        const trimmed = command.payload.name.trim();
        if (!trimmed) {
          return {
            ok: false,
            state,
            error: { code: 'INVALID_NAME', message: 'Household name cannot be empty' },
          };
        }

        nextState = {
          ...nextState,
          householdName: trimmed,
        };

        const evt = createDomainEvent(
          'HOUSEHOLD_RENAMED',
          [],
          { name: trimmed },
          state.clock.simMinute,
          nextState.nextEventSequence++
        );
        events.push(evt);
        break;
      }

      case 'ADOPT_CAT': {
        const available = calculateAvailableCapacity(state);
        if (available <= 0 || state.livingCatIds.length >= MAX_LIVING_CATS_CAPACITY) {
          return {
            ok: false,
            state,
            error: { code: 'CAPACITY_EXCEEDED', message: 'Cannot adopt: maximum capacity reached' },
          };
        }

        const adoptedCat = createCatRecord({
          householdId: state.householdId,
          name: command.payload.name,
          appearance: command.payload.appearance,
          traits: command.payload.traits,
          createdAtSimMinute: state.clock.simMinute,
        });

        nextState = {
          ...nextState,
          livingCatIds: [...nextState.livingCatIds, adoptedCat.id],
          cats: { ...nextState.cats, [adoptedCat.id]: adoptedCat },
          selectedCatId: nextState.selectedCatId ?? adoptedCat.id,
        };

        const evt = createDomainEvent(
          'CAT_ADOPTED',
          [adoptedCat.id],
          { catId: adoptedCat.id, name: adoptedCat.name },
          state.clock.simMinute,
          nextState.nextEventSequence++
        );
        events.push(evt);
        break;
      }

      default: {
        // Delegate to subsystem reducer
        const subResult = handleSubsystemCommand(nextState, command, context, rng);
        if (subResult.error) {
          return { ok: false, state, error: subResult.error };
        }
        if (!subResult.handled) {
          return {
            ok: false,
            state,
            error: { code: 'UNKNOWN_COMMAND', message: `Unknown command type: ${(command as any).type}` },
          };
        }
        nextState = subResult.state;
        events.push(...subResult.events);
        break;
      }
    }

    // Persist updated RNG snapshot
    const rngSnap = rng.snapshot();
    nextState = {
      ...nextState,
      rng: {
        seed: rngSnap.seed,
        counter: rngSnap.drawCount,
        serializedState: rng.serialize(),
      },
      events: [...nextState.events, ...events].slice(-128),
      revision: nextState.revision + 1,
    };

    // Create receipt
    const receipt = createReceipt(
      context.commandId,
      state.clock.simMinute,
      context.actorId,
      command.type,
      true,
      command.payload
    );
    nextState.commandReceipts = appendReceipt(nextState.commandReceipts, receipt);

    // Assert domain invariants
    assertInvariants(nextState);

    return { ok: true, state: nextState, events };
  } catch (err: any) {
    return {
      ok: false,
      state,
      error: { code: 'INTERNAL_ERROR', message: err?.message || 'Error dispatching command' },
    };
  }
}
