/**
 * Cats Domain Engine — Canonical Entry Point
 *
 * Exposes complete typed deterministic game engine, pure state reducers,
 * authoritative simulation advancement, GameView selectors, and subsystems.
 */

// Core types & state
export * from './state';

// Commands & dispatch
export {
  dispatch,
  type GameCommand,
  type CommandResult,
} from './commands';

// Simulation
export * from './simulation';

// View selectors
export * from './selectors';

// Invariants
export * from './invariants';

// RNG
export * from './rng';

// Scenarios
export * from './scenarios';

// Subsystem orchestration
export {
  handleSubsystemCommand,
  isBuildingCommand,
  isSocialCommand,
  isEconomyCommand,
  isNeighborhoodCommand,
  isLifecycleCommand,
  reduceBuilding,
  advanceBuilding,
  reduceSocial,
  advanceSocial,
  reduceEconomy,
  advanceEconomy,
  getCareerOutfit,
  reduceNeighborhood,
  advanceNeighborhood,
  reduceLifecycle,
  advanceLifecycle,
  type BuildingCommand,
  type SocialCommand,
  type EconomyCommand,
  type NeighborhoodCommand,
  type LifecycleCommand,
  type SubsystemHandlerResult,
} from './core/subsystems';

// Core utilities
export * from './core/cat';
export * from './core/events';
export * from './core/idempotency';
export * from './core/navigation';

// Subsystem modules
export * as building from './building';
export * as social from './social';
export * as economy from './economy';
export * as neighborhood from './neighborhood';
export * as lifecycle from './lifecycle';
