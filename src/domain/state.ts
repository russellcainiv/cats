// src/domain/state.ts
// Task 01: Household state model.
// Stable, versioned. No rendering or network imports.

export type Household = {
  id: string;          // stable household identity (UUID)
  ownerId: string;     // authenticated owner (never trusted from client)
  name: string;        // player-chosen, survives reload
  seed: string;        // RNG seed for deterministic simulation
  revision: number;    // CAS revision, monotonically increasing
  createdAt: number;   // epoch ms
};

export type WorldState = {
  household: Household;
  // Future slices extend here (cats, world, economy, etc.)
};

export type GameState = WorldState;
