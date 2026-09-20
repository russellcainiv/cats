/**
 * Action Queue and Execution State Machine
 */

import { ActionQueueItem, CatRecord, GridCell } from '../state';
import { applyCareSatisfaction } from './needs';

export interface CreateActionOptions {
  id?: string;
  type: string;
  targetId?: string;
  targetPosition?: GridCell;
  durationMinutes?: number;
  isInterruptible?: boolean;
  autonomous?: boolean;
  payload?: Record<string, unknown>;
}

export const DEFAULT_ACTION_DURATIONS: Record<string, number> = {
  move: 2,
  eat: 3,
  sleep: 20,
  litter: 2,
  groom: 5,
  scratch: 4,
  play: 8,
  moo_moo: 10,
  social: 4,
  idle: 5,
};

export function createAction(options: CreateActionOptions): ActionQueueItem {
  const id = options.id || `act_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const durationMinutes = options.durationMinutes ?? (DEFAULT_ACTION_DURATIONS[options.type] || 5);

  return {
    id,
    type: options.type,
    targetId: options.targetId,
    targetPosition: options.targetPosition,
    durationMinutes,
    elapsedMinutes: 0,
    isInterruptible: options.isInterruptible ?? true,
    autonomous: options.autonomous ?? false,
    payload: options.payload,
  };
}

export interface ActionStepResult {
  cat: CatRecord;
  completedAction: ActionQueueItem | null;
  events: string[];
}

/**
 * Steps the cat's active action forward in time and applies completion effects
 */
export function stepCatAction(cat: CatRecord, elapsedMinutes: number): ActionStepResult {
  if (cat.lifeStatus !== 'living') {
    return { cat, completedAction: null, events: [] };
  }

  let activeAction = cat.currentAction;
  let actionQueue = [...cat.actionQueue];
  const events: string[] = [];

  // If no current action, try popping from queue
  if (!activeAction && actionQueue.length > 0) {
    activeAction = actionQueue.shift()!;
  }

  if (!activeAction) {
    return { cat: { ...cat, currentAction: null, actionQueue }, completedAction: null, events: [] };
  }

  const newElapsed = activeAction.elapsedMinutes + elapsedMinutes;
  if (newElapsed >= activeAction.durationMinutes) {
    // Action completed!
    const completed = { ...activeAction, elapsedMinutes: activeAction.durationMinutes };
    let updatedNeeds = { ...cat.needs };

    // Apply standard care satisfaction effects upon completion
    if (['eat', 'sleep', 'litter', 'groom', 'scratch', 'play'].includes(completed.type)) {
      updatedNeeds = applyCareSatisfaction(
        updatedNeeds,
        cat.traits,
        completed.type as 'eat' | 'sleep' | 'litter' | 'groom' | 'scratch' | 'play'
      );
      events.push(`Completed ${completed.type}`);
    }

    // Pick next action if available
    const nextAction = actionQueue.length > 0 ? actionQueue.shift()! : null;

    const updatedCat: CatRecord = {
      ...cat,
      needs: updatedNeeds,
      currentAction: nextAction,
      actionQueue,
    };

    return { cat: updatedCat, completedAction: completed, events };
  } else {
    // Still in progress
    const updatedAction = { ...activeAction, elapsedMinutes: newElapsed };
    return {
      cat: { ...cat, currentAction: updatedAction, actionQueue },
      completedAction: null,
      events: [],
    };
  }
}

/**
 * Cancels current active action and clears queue
 */
export function cancelCatActions(cat: CatRecord): CatRecord {
  return {
    ...cat,
    currentAction: null,
    actionQueue: [],
    lastRoute: [],
  };
}
