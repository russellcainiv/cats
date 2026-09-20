/**
 * Bounded Event Log System
 */

import { DomainEvent, EventId, MAX_EVENTS_LOG_SIZE } from '../state';

export function createDomainEvent(
  type: string,
  actorIds: string[],
  payload: Record<string, unknown>,
  simTime: number,
  sequence: number,
  rngLabel?: string
): DomainEvent {
  const id: EventId = `evt_${sequence}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  return {
    id,
    type,
    sequence,
    simTime,
    actorIds,
    payload,
    rngLabel,
  };
}

export function appendEvent(
  events: readonly DomainEvent[],
  newEvent: DomainEvent,
  maxEvents: number = MAX_EVENTS_LOG_SIZE
): DomainEvent[] {
  const updated = [...events, newEvent];
  if (updated.length > maxEvents) {
    return updated.slice(updated.length - maxEvents);
  }
  return updated;
}
