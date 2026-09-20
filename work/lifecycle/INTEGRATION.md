# Lifecycle Subsystem Integration Specification (`work/lifecycle/INTEGRATION.md`)

## 1. Ownership & Scope
- **Owner**: Lifecycle Domain Worker (AGY Gemini 3.8 Flash High)
- **Owned Worktree**: `/Users/russell/.codex/worktrees/cats-lifecycle/Cats`
- **Owned Directories**:
  - `src/domain/lifecycle/**`
  - `tests/domain/lifecycle/**`
  - `work/lifecycle/**`

## 2. Module Exports (`src/domain/lifecycle/index.ts`)
```typescript
export * from './types';
export * from './rng';
export * from './genetics';
export * from './birth';
export * from './aging';
export * from './hazards';
export * from './ghosts';

export function initLifecycleState(): LifecycleSubsystemState;
export function isLifecycleCommand(command: GameCommand): command is LifecycleCommand;
export function reduceLifecycle(state: WorldState, command: LifecycleCommand, context: CommandContext): CommandResult;
export function advanceLifecycle(state: WorldState, elapsedSimMinutes: number): WorldState;
```

## 3. Supported Commands (`LifecycleCommand`)
- `TRIGGER_BIRTH`: `{ type: 'TRIGGER_BIRTH', payload: { pregnancyId: PregnancyId, kittenNames?: string[] } }`
- `INTERVENE_HAZARD`: `{ type: 'INTERVENE_HAZARD', payload: { catId: CatId, treatmentType?: 'vet' | 'care' | 'extinguish' } }`
- `PLACE_MEMORIAL`: `{ type: 'PLACE_MEMORIAL', payload: { deceasedCatId: CatId, lotId: LotId, x: number, y: number } }`
- `DISMISS_GHOST`: `{ type: 'DISMISS_GHOST', payload: { memorialId: MemorialId } }`

## 4. Canonical Schema Alignments
### Active-Only Pregnancy Schema
Conforms to `cats-engine/src/domain/state.ts` and orchestrator parallel integration ruling:
```typescript
export interface PregnancyRecord {
  id: PregnancyId;
  parentIds: [CatId, CatId]; // [gestatingCatId, otherParentId]
  startedAtSimMinute: number;
  dueAtSimMinute: number;
  reservedSlots: number;
  conceptionEventId: string;
  // Backward compatibility fields
  damId?: CatId;
  sireId?: CatId;
  motherId?: CatId;
  fatherId?: CatId;
  conceptionSimMinute?: number;
  conceivedAtSimMinute?: number;
  dueSimMinute?: number;
  litterSize?: number;
  resolved?: boolean;
  rngSeedAtConception?: number;
}
```

**Capacity Policy**:
- Only ACTIVE pregnancies are stored in `state.lifecycle.pregnancies`.
- When birth is executed or pregnancy is cancelled, the record is removed from `lifecycle.pregnancies` (`delete updatedPregnancies[pregnancyId]`), releasing capacity reservations atomically. Historical data lives in ancestry (`family.childIds`), memories, and events.

### Canonical Domain PRNG (`src/domain/lifecycle/rng.ts`)
- Replaces private LCG with canonical Mulberry32 + SplitMix32 implementation (`SeededRng`).
- Provides `nextRng(rng: RngStateData): [number, RngStateData]`.
- Implements state serialization via `RngStateData.serializedState` and draw counting (`drawCount`).

### CatRecord Base Fields & Career Outfit Preservation
- Preserves `careerOutfit?: CareerOutfit | null`, `baseAppearance?: CatAppearance`, and `isAtWork?: boolean` across kitten birth, aging ticks, and death transitions.

## 5. Review Defects Remediated
1. **REPRO-01 (Pregnancy Schema Incompatibility)**: `processGestationTick` and `executeBirth` inspect `parentIds[0]` (gestating dam) with fallbacks to `damId` and `motherId`. Conceived pregnancies from Social are correctly identified without false `dam_not_found` cancellations.
2. **REPRO-05 (Memorial In-Place Mutation)**: `processGhostTick` clones the memorial record and `state.lifecycle.memorials` map immutably before appending ghost visit records.
3. **REPRO-06 (Hazard Timer Tick Invariance)**: In `processHazardsTick`, `warningIssuedAtMinute` is established at the start of the elapsed simulation step (`Math.max(0, currentSimMinute - elapsedSimMinutes)`). Expirations are evaluated deterministically, producing invariant death outcomes regardless of caller batching (e.g. 1 x 130m vs 13 x 10m).
4. **REPRO-07 (Double Simulation Clock Advance)**: Removed clock mutation from `advanceLifecycle`. Core engine advances the authoritative simulation clock; `advanceLifecycle` processes ticks at the current boundary.
5. **REPRO-08 (Divergent PRNG & Type Shadowing)**: Replaced LCG in `genetics.ts` with canonical `SeededRng` in `rng.ts`.

## 6. Verification Evidence
Run all lifecycle and composed tests with:
```bash
bun test tests/domain/lifecycle
```
Output:
- 29 tests passing across 7 test files (0 failures).
  - `lifecycle_comprehensive.test.ts` (8 tests)
  - `hazards.test.ts` (3 tests)
  - `aging.test.ts` (3 tests)
  - `birth.test.ts` (2 tests)
  - `ghosts.test.ts` (3 tests)
  - `regression_remediation.test.ts` (5 tests)
  - `composed_integration.test.ts` (5 tests)

## 7. Remaining Integration Gates
1. Engine orchestrator composition in `cats-engine` to run composed tick loop with economy, building, and world modules.
2. Central state and command dispatch migration once core repairs merge.
