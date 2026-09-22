// src/domain/commands.ts
// Task 01: create-household. Task 02: move-cat with pathfinding.
import { WorldState } from './state';
import { findPath } from './invariants';
import { v4 as uuidv4 } from 'uuid';

export type CommandContext = {
  actorId: string;
  commandId: string;
};

export type DomainEvent = {
  type: string;
  householdId: string;
  sequence: number;
  payload?: Record<string, unknown>;
};

export type CommandResult =
  | { ok: true; state: WorldState; events: DomainEvent[] }
  | { ok: false; state: WorldState; error: { code: string; message: string } };

// --- Task 01 ---
export type CreateHousehold = {
  type: 'create-household';
  payload: { name: string };
};

// --- Task 02 ---
export type MoveCat = {
  type: 'move-cat';
  payload: { catId: string; destination: { lotId: string; x: number; y: number } };
};

export type LaunchWorld = {
  type: 'launch-world';
  payload: Record<string, never>;
};

export type GameCommand = CreateHousehold | MoveCat | LaunchWorld;

export function dispatch(
  state: WorldState,
  command: GameCommand,
  context: CommandContext
): CommandResult {
  switch (command.type) {
    case 'create-household': {
      if (state.household.id) {
        return {
          ok: false,
          state,
          error: { code: 'household-exists', message: 'Household already created' },
        };
      }
      const householdId = uuidv4();
      const seed = uuidv4();
      const newState: WorldState = {
        household: {
          id: householdId,
          ownerId: context.actorId,
          name: command.payload.name || 'My cats',
          seed,
          revision: 1,
          createdAt: Date.now(),
          launched: false,
          leaseEpoch: 0,
        },
        cats: {
          mochi: {
            id: 'mochi',
            name: 'Mochi',
            position: { lotId: 'home', x: 6, y: 4 },
            lastRoute: [],
            needs: { hunger: 80, energy: 80, fun: 50 },
            state: 'idle',
          },
        },
        home: {
          lotId: 'home',
          width: 8,
          height: 6,
          blockedCells: [{ lotId: 'home', x: 4, y: 3 }],
        },
        simMinute: 0,
        paused: false,
      };
      const event: DomainEvent = {
        type: 'household-created',
        householdId,
        sequence: 1,
        payload: { name: command.payload.name },
      };
      const result: CommandResult = { ok: true, state: newState, events: [event] };
      // TypeScript needs help with the union narrowing for the success branch.
      void context;
      void uuidv4;
      return result;
    }

    case 'move-cat': {
      const { catId, destination } = command.payload;
      const cat = state.cats[catId];
      if (!cat) {
        return { ok: false, state, error: { code: 'cat-not-found', message: 'Cat not found' } };
      }
      const path = findPath(cat.position, destination, state.home.blockedCells, state.home.width, state.home.height);
      if (!path) {
        return { ok: false, state, error: { code: 'unreachable', message: 'Destination is unreachable' } };
      }
      const newCat = { ...cat, position: destination, lastRoute: path, state: 'idle' as const };
      const newState: WorldState = {
        ...state,
        cats: { ...state.cats, [catId]: newCat },
        household: { ...state.household, revision: state.household.revision + 1 },
      };
      const event: DomainEvent = {
        type: 'cat-moved',
        householdId: state.household.id,
        sequence: newState.household.revision,
        payload: { catId, destination, routeLength: path.length },
      };
      return { ok: true, state: newState, events: [event] };
    }

    case 'launch-world': {
      if (!state.household.id) {
        return { ok: false, state, error: { code: 'no-household', message: 'Household not created' } };
      }
      const newState: WorldState = {
        ...state,
        household: { ...state.household, launched: true, revision: state.household.revision + 1 },
      };
      const event: DomainEvent = {
        type: 'world-launched',
        householdId: state.household.id,
        sequence: newState.household.revision,
        payload: {},
      };
      return { ok: true, state: newState, events: [event] };
    }

    default:
      return {
        ok: false,
        state,
        error: { code: 'unknown-command', message: `Unknown command: ${(command as GameCommand).type}` },
      };
  }
}
