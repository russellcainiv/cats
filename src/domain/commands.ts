// src/domain/commands.ts
// Task 01: create-household. Task 02: move-cat with pathfinding.
import { WorldState } from './state';
import { findPath, verifyCatCapacity } from './invariants';
import { v4 as uuidv4 } from 'uuid';
import { catCatalog, getAppearance, getTrait } from '@/content/cat-catalog';

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

// --- Task 04: cat creator ---
export type CreateCat = {
  type: 'create-cat';
  payload: {
    name: string;
    appearance: { variant: string };
    traits: { id: string; level: number }[];
  };
};

export type LaunchWorld = {
  type: 'launch-world';
  payload: Record<string, never>;
};

export type GameCommand = CreateHousehold | MoveCat | LaunchWorld | CreateCat;

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
            appearance: { variant: 'orange-tabby' },
            traits: [{ id: 'playful', level: 70 }],
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

    case 'create-cat': {
      // R20: enforce eight living cat capacity.
      const livingCount = Object.keys(state.cats).length;
      const violation = verifyCatCapacity(livingCount);
      if (violation) {
        return {
          ok: false,
          state,
          error: { code: violation.code, message: violation.message },
        };
      }

      // R07: reject blank/unsafe names.
      const trimmed = command.payload.name.trim();
      if (!trimmed) {
        return { ok: false, state, error: { code: 'invalid-name', message: 'Name cannot be blank' } };
      }

      // R07: validate appearance variant against catalog.
      const { variant } = command.payload.appearance;
      if (!getAppearance(variant)) {
        return { ok: false, state, error: { code: 'unknown-appearance', message: `Unknown appearance: ${variant}` } };
      }

      // R07: validate traits against catalog, max 3 traits.
      const traits = command.payload.traits;
      if (traits.length > 3) {
        return { ok: false, state, error: { code: 'too-many-traits', message: 'Maximum 3 traits per cat' } };
      }
      for (const t of traits) {
        if (!getTrait(t.id)) {
          return { ok: false, state, error: { code: 'unknown-trait', message: `Unknown trait: ${t.id}` } };
        }
      }

      // Assign a spawn position: first empty cell in reading order.
      const home = state.home;
      const existingPositions = new Set(Object.values(state.cats).map(c => `${c.position.x},${c.position.y}`));
      let spawnX = 0;
      let spawnY = 0;
      outer: for (let y = 0; y < home.height; y++) {
        for (let x = 0; x < home.width; x++) {
          const blocked = home.blockedCells.some(b => b.x === x && b.y === y);
          const occupied = existingPositions.has(`${x},${y}`);
          if (!blocked && !occupied) {
            spawnX = x;
            spawnY = y;
            break outer;
          }
        }
      }

      const catId = uuidv4();
      const newCat = {
        id: catId,
        name: trimmed,
        position: { lotId: home.lotId, x: spawnX, y: spawnY },
        lastRoute: [],
        needs: { hunger: 80, energy: 80, fun: 50 },
        state: 'idle' as const,
        appearance: { variant },
        traits: traits.map(t => ({ id: t.id, level: Math.max(0, Math.min(100, t.level)) })),
      };

      const newState: WorldState = {
        ...state,
        cats: { ...state.cats, [catId]: newCat },
        household: { ...state.household, revision: state.household.revision + 1 },
      };

      const event: DomainEvent = {
        type: 'cat-created',
        householdId: state.household.id,
        sequence: newState.household.revision,
        payload: { catId, name: trimmed, variant, traits: traits.map(t => t.id) },
      };

      void catCatalog; // available for future reference; validation uses helpers
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
