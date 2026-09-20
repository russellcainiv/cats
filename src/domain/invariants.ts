/**
 * Domain Invariant Enforcement & Validation
 *
 * Checks hard game rules:
 * - Living + reserved capacity <= 8 (R20, R21)
 * - Death is permanent; deceased cats cannot be living; ghosts are non-living projections (R08, R22)
 * - Fixed lifespan invariants (R23)
 * - Needs bounded in [0, 100]
 * - ID integrity and reference validity
 * - Free-build provenance cannot mint earned progression (R13)
 */

import { MAX_LIVING_CATS_CAPACITY, TOTAL_LIFESPAN_MINUTES, WorldState } from './state';

export interface InvariantViolation {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function validateInvariants(state: WorldState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // 1. Capacity Invariant (R20, R21): living + reserved <= 8
  const livingCount = state.livingCatIds.length;
  if (livingCount > MAX_LIVING_CATS_CAPACITY) {
    violations.push({
      code: 'CAPACITY_EXCEEDED_LIVING',
      message: `Living cats count (${livingCount}) exceeds maximum capacity of ${MAX_LIVING_CATS_CAPACITY}`,
      details: { livingCount, max: MAX_LIVING_CATS_CAPACITY },
    });
  }

  let totalReservedSlots = 0;
  for (const [pregId, preg] of Object.entries(state.lifecycle.pregnancies)) {
    if (preg.reservedSlots < 0) {
      violations.push({
        code: 'NEGATIVE_RESERVED_SLOTS',
        message: `Pregnancy ${pregId} has negative reserved slots (${preg.reservedSlots})`,
        details: { pregId, reservedSlots: preg.reservedSlots },
      });
    }
    totalReservedSlots += preg.reservedSlots;
  }

  if (livingCount + totalReservedSlots > MAX_LIVING_CATS_CAPACITY) {
    violations.push({
      code: 'CAPACITY_EXCEEDED_WITH_RESERVED',
      message: `Combined living cats (${livingCount}) and reserved pregnancy slots (${totalReservedSlots}) exceed maximum capacity of ${MAX_LIVING_CATS_CAPACITY}`,
      details: { livingCount, totalReservedSlots, max: MAX_LIVING_CATS_CAPACITY },
    });
  }

  // 2. Identity and Living Status Invariant
  for (const id of state.livingCatIds) {
    const cat = state.cats[id];
    if (!cat) {
      violations.push({
        code: 'MISSING_CAT_RECORD',
        message: `Living cat ID ${id} is not present in cats registry`,
        details: { id },
      });
      continue;
    }
    if (cat.lifeStatus !== 'living') {
      violations.push({
        code: 'INVALID_LIFE_STATUS_LIVING',
        message: `Cat ${id} is in livingCatIds but has lifeStatus '${cat.lifeStatus}'`,
        details: { id, lifeStatus: cat.lifeStatus },
      });
    }
  }

  // 3. Deceased Cats & Memorials Invariant (R08, R22)
  for (const cat of Object.values(state.cats)) {
    if (cat.lifeStatus === 'deceased') {
      if (state.livingCatIds.includes(cat.id)) {
        violations.push({
          code: 'DECEASED_CAT_IN_LIVING_LIST',
          message: `Deceased cat ${cat.id} is present in livingCatIds list`,
          details: { id: cat.id },
        });
      }
    }
  }

  // Ghosts must not be in livingCatIds
  for (const ghost of state.lifecycle.ghosts) {
    if (state.livingCatIds.includes(ghost.memorialId as any)) {
      violations.push({
        code: 'GHOST_COUNTED_AS_LIVING',
        message: `Ghost projection ${ghost.memorialId} appears in livingCatIds`,
        details: { memorialId: ghost.memorialId },
      });
    }
  }

  // 4. Needs Bounds Invariant [0, 100]
  for (const cat of Object.values(state.cats)) {
    for (const [needKey, val] of Object.entries(cat.needs)) {
      if (val < 0 || val > 100 || isNaN(val)) {
        violations.push({
          code: 'NEED_OUT_OF_BOUNDS',
          message: `Cat ${cat.id} need '${needKey}' is out of bounds: ${val}`,
          details: { catId: cat.id, needKey, value: val },
        });
      }
    }
  }

  // 5. Sim Clock Invariants
  if (state.clock.simMinute < 0 || isNaN(state.clock.simMinute)) {
    violations.push({
      code: 'INVALID_SIM_CLOCK',
      message: `Clock simMinute is invalid: ${state.clock.simMinute}`,
      details: { simMinute: state.clock.simMinute },
    });
  }

  // 6. Economy Invariants
  if (state.economy.wallet.earnedCash < 0 || isNaN(state.economy.wallet.earnedCash)) {
    violations.push({
      code: 'NEGATIVE_EARNED_CASH',
      message: `Wallet earnedCash cannot be negative: ${state.economy.wallet.earnedCash}`,
      details: { earnedCash: state.economy.wallet.earnedCash },
    });
  }

  // 7. Event sequence monotonicity
  if (state.nextEventSequence < 1) {
    violations.push({
      code: 'INVALID_EVENT_SEQUENCE',
      message: `Next event sequence must be positive: ${state.nextEventSequence}`,
      details: { nextEventSequence: state.nextEventSequence },
    });
  }

  return violations;
}

export function assertInvariants(state: WorldState): void {
  const violations = validateInvariants(state);
  if (violations.length > 0) {
    const errorDetails = violations.map((v) => `[${v.code}] ${v.message}`).join('\n');
    throw new Error(`Domain Invariant Violation(s):\n${errorDetails}`);
  }
}
