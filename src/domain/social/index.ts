// src/domain/social/index.ts
// Entry point for the Social Domain Subsystem.

export * from './types';
export * from './rng';
export * from './relationships';
export * from './readiness';
export {
  isSocialCommand,
  initializeSocialState,
  reduceSocial
} from './reducer';
export { advanceSocial } from './advance';
