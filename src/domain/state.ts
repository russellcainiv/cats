// src/domain/state.ts
// Task 01: Household state model. Task 02: cats, home layout, positions.
// Stable, versioned. No rendering or network imports.

export type Household = {
  id: string;          // stable household identity (UUID)
  ownerId: string;     // authenticated owner (never trusted from client)
  name: string;        // player-chosen, survives reload
  seed: string;        // RNG seed for deterministic simulation
  revision: number;    // CAS revision, monotonically increasing
  createdAt: number;   // epoch ms
  launched: boolean;   // true when the world has been entered (cats visible)
  leaseEpoch: number;  // server-issued lease epoch; stale saves rejected
};

/** A cell coordinate within a lot. */
export type Position = {
  lotId: string;
  x: number;
  y: number;
};

/** A cat in the household. */
export type CatAppearance = {
  variant: string; // canonical catalog ID (e.g. "orange-tabby")
};

export type CatTrait = {
  id: string;    // canonical catalog ID (e.g. "playful")
  level: number; // 0–100
};

export type Cat = {
  id: string;               // stable id (e.g. "mochi" or a UUID)
  name: string;             // display name (Unicode supported)
  position: Position;       // current cell
  lastRoute: Position[];    // cells traversed on last completed move
  needs: { hunger: number; energy: number; fun: number };
  state: 'idle' | 'moving' | 'sleeping';
  appearance: CatAppearance; // NEW: coat/color variant
  traits: CatTrait[];       // NEW: personality traits
};

/** The home lot: a grid with blocked cells (walls, furniture). */
export type Home = {
  lotId: string;
  width: number;          // grid cells (x: 0..width-1)
  height: number;         // grid cells (y: 0..height-1)
  blockedCells: Position[];
};

export type WorldState = {
  household: Household;
  cats: Record<string, Cat>;
  home: Home;
  simMinute: number;      // simulation time in minutes
  paused: boolean;        // simulation paused (no time advances while away)
};

export type GameState = WorldState;
