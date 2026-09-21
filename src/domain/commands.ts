// src/domain/commands.ts
// Task 01: Command types and atomic dispatch entrypoint.

import { WorldState } from './state';
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

// Task 01 commands only.
export type CreateHousehold = {
  type: 'create-household';
  payload: { name: string };
};

export type GameCommand = CreateHousehold;

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
      const event: DomainEvent = {
        type: 'household-created',
        householdId: uuidv4(),
        sequence: 1,
        payload: { name: command.payload.name },
      };
      const newState: WorldState = {
        household: {
          id: event.householdId,
          ownerId: context.actorId,
          name: command.payload.name || 'My cats',
          seed: uuidv4(),
          revision: 1,
          createdAt: Date.now(),
        },
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
