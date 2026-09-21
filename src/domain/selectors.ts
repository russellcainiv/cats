// src/domain/selectors.ts
// Read-only GameView for UI; rendering never changes the world.

import { WorldState } from './state';

export type GameView = {
  household: {
    id: string;
    ownerId: string;
    name: string;
    seed: string;
    revision: number;
    createdAt: number;
  };
};

export function selectView(state: WorldState): GameView {
  return {
    household: {
      id: state.household.id,
      ownerId: state.household.ownerId,
      name: state.household.name,
      seed: state.household.seed,
      revision: state.household.revision,
      createdAt: state.household.createdAt,
    },
  };
}
