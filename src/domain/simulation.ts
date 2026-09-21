// src/domain/simulation.ts
// Fixed-step advance. Task 01 households have no time-dependent behavior yet,
// so this is the real entry point wired for future simulation slices.

import { WorldState } from './state';

export function advance(state: WorldState, elapsedSimMinutes: number): WorldState {
  // No time-dependent systems in Task 01. Passes state through unchanged.
  // Future: needs decay, aging, autonomy, careers, events, etc.
  void elapsedSimMinutes;
  return state;
}
