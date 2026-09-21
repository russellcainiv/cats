// src/domain/invariants.ts
// Task 01: Capacity, identity, ownership invariants.

import { WorldState } from './state';

export type Violation = { code: string; message: string };

export function checkInvariants(state: WorldState): Violation[] {
  const violations: Violation[] = [];
  if (!state.household?.id) {
    violations.push({ code: 'missing-id', message: 'Household must have a stable identity' });
  }
  if (!state.household?.ownerId) {
    violations.push({ code: 'missing-owner', message: 'Household must have an owner' });
  }
  if (state.household?.id && !state.household?.ownerId) {
    violations.push({ code: 'identity-owner-mismatch', message: 'Identity without owner' });
  }
  return violations;
}

// Cross-owner isolation: returns whether the actor may read/write this household.
export function canAccess(householdOwnerId: string, actorId: string | null): boolean {
  return actorId !== null && householdOwnerId === actorId;
}
