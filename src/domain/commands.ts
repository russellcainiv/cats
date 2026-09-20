/**
 * Atomic Command Protocol and Dispatch Pipeline
 */

import { createCatRecord, validateCatName } from './core/cat';
import { createDomainEvent } from './core/events';
import { appendReceipt, createReceipt, findReceipt } from './core/idempotency';
import { cellKey, findPath } from './core/navigation';
import { handleSubsystemCommand } from './core/subsystems';
import { assertInvariants, DomainInvariantError } from './invariants';
import { SeededRng } from './rng';
import {
  ActionQueueItem,
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
    const incomingReceipt = createReceipt(
      context.commandId,
      0,
      context.actorId,
      command.type,
      true,
      command.payload
    );

    if (
      existingReceipt.type !== command.type ||
      existingReceipt.receiptChecksum !== incomingReceipt.receiptChecksum ||
      existingReceipt.actorId !== context.actorId
    ) {
      return {
        ok: false,
        state,
        error: {
          code: 'COMMAND_ID_PAYLOAD_MISMATCH',
          message: 'Command ID reused with different payload, type, or actor',
        },
      };
    }

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

        const catSeq = nextState.nextEventSequence;
        const safeName = trimmedName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'cat';
        const newCatId = `cat_${safeName}_${state.clock.simMinute}_${catSeq}`;

        const newCat = createCatRecord({
          id: newCatId,
          householdId: state.householdId,
          name: trimmedName,
          appearance: command.payload.appearance,
          traits: command.payload.traits,
          createdAtSimMinute: state.clock.simMinute,
        });

        nextState = {
          ...nextState,
          clock: {
            ...nextState.clock,
            isPaused: state.livingCatIds.length === 0 ? false : nextState.clock.isPaused,
          },
          livingCatIds: [...nextState.livingCatIds, newCat.id],
          cats: { ...nextState.cats, [newCat.id]: newCat },
          selectedCatId: nextState.selectedCatId ?? newCat.id,
          nextEventSequence: catSeq + 1,
        };

        const evt = createDomainEvent(
          'CAT_CREATED',
          [newCat.id],
          { catId: newCat.id, name: newCat.name },
          state.clock.simMinute,
          catSeq
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

        const moveSeq = nextState.nextEventSequence;
        const updatedCat: CatRecord = {
          ...cat,
          lastRoute: pathResult.route,
          currentAction: {
            id: `act_move_${catId}_${state.clock.simMinute}_${moveSeq}`,
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
          nextEventSequence: moveSeq + 1,
        };

        const evt = createDomainEvent(
          'CAT_MOVE_ORDERED',
          [catId],
          { target, routeLength: pathResult.route.length },
          state.clock.simMinute,
          moveSeq
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

        const careSeq = nextState.nextEventSequence;
        const careActionItem = {
          id: `act_${actionType}_${catId}_${state.clock.simMinute}_${careSeq}`,
          type: actionType,
          targetId: targetObjectId,
          durationMinutes: 3,
          elapsedMinutes: 0,
          isInterruptible: true,
          autonomous: false,
        };

        const lot = state.building.lots[cat.position.lotId];
        let initialAction: ActionQueueItem = careActionItem;
        let queuedActions = [...cat.actionQueue];
        let routeToSpot: GridCell[] = [];

        if (targetObjectId && lot) {
          const obj = lot.objects.find((o) => o.id === targetObjectId);
          if (obj) {
            const spot =
              obj.interactSpots && obj.interactSpots.length > 0
                ? obj.interactSpots.find((s) => !lot.blockedCells.includes(cellKey(s.x, s.y))) || obj.interactSpots[0]
                : { x: obj.x, y: obj.y };

            if (cat.position.x !== spot.x || cat.position.y !== spot.y) {
              const pathRes = findPath(lot, { x: cat.position.x, y: cat.position.y }, spot);
              if (!pathRes.reachable) {
                return {
                  ok: false,
                  state,
                  error: { code: 'UNREACHABLE_PATH', message: pathRes.error || 'Destination cell is unreachable or blocked' },
                };
              }
              routeToSpot = pathRes.route;
              initialAction = {
                id: `act_move_${catId}_${state.clock.simMinute}_${careSeq}`,
                type: 'move',
                targetPosition: spot,
                durationMinutes: Math.max(1, routeToSpot.length - 1),
                elapsedMinutes: 0,
                isInterruptible: true,
                autonomous: false,
                payload: { route: routeToSpot },
              };
              queuedActions = [careActionItem, ...queuedActions];
            }
          }
        }

        const updatedCat: CatRecord = {
          ...cat,
          currentAction: initialAction,
          actionQueue: queuedActions,
          lastRoute: routeToSpot,
        };

        nextState = {
          ...nextState,
          cats: { ...nextState.cats, [catId]: updatedCat },
          nextEventSequence: careSeq + 1,
        };

        const evt = createDomainEvent(
          'CARE_DIRECTED',
          [catId],
          { actionType, targetObjectId },
          state.clock.simMinute,
          careSeq
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

        const { valid, error, trimmedName } = validateCatName(command.payload.name);
        if (!valid) {
          return {
            ok: false,
            state,
            error: { code: 'INVALID_NAME', message: error || 'Invalid cat name' },
          };
        }

        const adoptSeq = nextState.nextEventSequence;
        const safeName = trimmedName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'adopted';
        const adoptedCatId = `cat_${safeName}_${state.clock.simMinute}_${adoptSeq}`;

        const adoptedCat = createCatRecord({
          id: adoptedCatId,
          householdId: state.householdId,
          name: trimmedName,
          appearance: command.payload.appearance,
          traits: command.payload.traits,
          createdAtSimMinute: state.clock.simMinute,
        });

        nextState = {
          ...nextState,
          clock: {
            ...nextState.clock,
            isPaused: state.livingCatIds.length === 0 ? false : nextState.clock.isPaused,
          },
          livingCatIds: [...nextState.livingCatIds, adoptedCat.id],
          cats: { ...nextState.cats, [adoptedCat.id]: adoptedCat },
          selectedCatId: nextState.selectedCatId ?? adoptedCat.id,
          nextEventSequence: adoptSeq + 1,
        };

        const evt = createDomainEvent(
          'CAT_ADOPTED',
          [adoptedCat.id],
          { catId: adoptedCat.id, name: adoptedCat.name },
          state.clock.simMinute,
          adoptSeq
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
    if (err instanceof DomainInvariantError || err?.code === 'INVARIANT_VIOLATION' || err?.name === 'DomainInvariantError') {
      return {
        ok: false,
        state,
        error: {
          code: 'INVARIANT_VIOLATION',
          message: err?.message || 'Domain invariant violation',
        },
      };
    }
    return {
      ok: false,
      state,
      error: { code: 'INTERNAL_ERROR', message: err?.message || 'Error dispatching command' },
    };
  }
}
