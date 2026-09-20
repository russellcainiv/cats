// src/domain/lifecycle/index.ts
// Primary lifecycle subsystem exports: commands, reducer, advance ticker, initializer, discriminator.

import {
  WorldState,
  LifecycleSubsystemState,
  LifecycleCommand,
  GameCommand,
  CommandContext,
  CommandResult,
  DomainEvent,
} from './types';

import { executeBirth, processGestationTick } from './birth';
import { processAgingTick } from './aging';
import { processHazardsTick, executeHazardIntervention } from './hazards';
import { processGhostTick, executePlaceMemorial, executeDismissGhost } from './ghosts';

export * from './types';
export * from './genetics';
export * from './birth';
export * from './aging';
export * from './hazards';
export * from './ghosts';

/**
 * Initializes empty Lifecycle subsystem state.
 */
export function initLifecycleState(): LifecycleSubsystemState {
  return {
    pregnancies: {},
    memorials: {},
    ghosts: [],
    lastGhostCheckNight: -1,
  };
}

/**
 * Type discriminator check for Lifecycle commands.
 */
export function isLifecycleCommand(command: GameCommand): command is LifecycleCommand {
  return (
    command.type === 'TRIGGER_BIRTH' ||
    command.type === 'INTERVENE_HAZARD' ||
    command.type === 'PLACE_MEMORIAL' ||
    command.type === 'DISMISS_GHOST'
  );
}

/**
 * Pure atomic full-world command reducer for Lifecycle subsystem.
 */
export function reduceLifecycle(
  state: WorldState,
  command: LifecycleCommand,
  context: CommandContext
): CommandResult {
  switch (command.type) {
    case 'TRIGGER_BIRTH':
      return executeBirth(state, command, context);
    case 'INTERVENE_HAZARD':
      return executeHazardIntervention(state, command, context);
    case 'PLACE_MEMORIAL':
      return executePlaceMemorial(state, command, context);
    case 'DISMISS_GHOST':
      return executeDismissGhost(state, command, context);
    default:
      return {
        ok: false,
        state,
        error: { code: 'UNKNOWN_COMMAND', message: `Unknown lifecycle command type` },
      };
  }
}

/**
 * Pure atomic full-world simulation tick / advance function for Lifecycle subsystem.
 */
export function advanceLifecycle(state: WorldState, elapsedSimMinutes: number): WorldState {
  if (state.clock.isPaused || elapsedSimMinutes <= 0) {
    return state;
  }

  let currentState = { ...state };

  // 1. Advance simulation clock minute
  currentState = {
    ...currentState,
    clock: {
      ...currentState.clock,
      simMinute: currentState.clock.simMinute + elapsedSimMinutes,
    },
  };

  // 2. Process gestation ticks (carrier death checks & pregnancy cancellations)
  const gestationResult = processGestationTick(currentState, elapsedSimMinutes);
  currentState = gestationResult.state;

  // 3. Process aging ticks (stage transitions and natural old-age death at 150 days)
  const agingResult = processAgingTick(currentState, elapsedSimMinutes);
  currentState = agingResult.state;

  // 4. Process hazard / illness / neglect warnings and preventable death timers
  const hazardResult = processHazardsTick(currentState, elapsedSimMinutes);
  currentState = hazardResult.state;

  // 5. Process ghost projection expirations and night-time seeded visits
  const ghostResult = processGhostTick(currentState, elapsedSimMinutes);
  currentState = ghostResult.state;

  return currentState;
}
