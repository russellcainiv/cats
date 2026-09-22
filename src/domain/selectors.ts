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
    launched: boolean;
    leaseEpoch: number;
  };
  cats: Record<string, {
    id: string;
    name: string;
    position: { lotId: string; x: number; y: number };
    lastRoute: { lotId: string; x: number; y: number }[];
    needs: { hunger: number; energy: number; fun: number };
    state: 'idle' | 'moving' | 'sleeping';
    appearance: { variant: string };
    traits: { id: string; level: number }[];
  }>;
  home: {
    lotId: string;
    width: number;
    height: number;
    blockedCells: { lotId: string; x: number; y: number }[];
  };
  simMinute: number;
  paused: boolean;
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
      launched: state.household.launched,
      leaseEpoch: state.household.leaseEpoch,
    },
    cats: state.cats,
    home: state.home,
    simMinute: state.simMinute,
    paused: state.paused,
  };
}
