# Lifecycle Domain Subsystem Progress Ledger (`work/lifecycle/PROGRESS.md`)

## Task Ownership & Context
- **Worker**: AGY Gemini 3.8 Flash High
- **Subsystem**: Lifecycle Domain Subsystem (Gestation, Birth, Genetics, Aging, Hazards, Memorials, Ghosts)
- **Repository Worktree**: `/Users/russell/.codex/worktrees/cats-lifecycle/Cats`
- **Baseline Evaluated**: `18da837` (feat: import Jules lifecycle subsystem for review)
- **Review Verdict Remediated**: Independent Review `REVIEW.md` (Lifecycle score 76/100 -> remediated to composable quality)

## Defects Fixed & Implemented Solutions
1. **REPRO-01 (Incompatible Pregnancy Schema)**:
   - Added canonical `parentIds: [gestatingCatId, otherParentId]`, `startedAtSimMinute`, `dueAtSimMinute`, `reservedSlots`, `conceptionEventId` to `PregnancyRecord` in `src/domain/lifecycle/types.ts`.
   - Updated `src/domain/lifecycle/birth.ts` (`processGestationTick` and `executeBirth`) to read `parentIds` with aliases `damId`/`motherId`.
   - Added regression test `tests/domain/lifecycle/regression_remediation.test.ts #1`.
2. **REPRO-02 / Active Capacity Policy**:
   - Updated `birth.ts`: active pregnancies are removed from `state.lifecycle.pregnancies` upon completed birth or cancellation. Reservations release exactly once, preventing capacity leaks.
   - Added composed test in `tests/domain/lifecycle/composed_integration.test.ts` verifying conception succeeds after prior birth.
3. **REPRO-05 (In-Place Mutation of Memorial Record in Ghost Tick)**:
   - In `src/domain/lifecycle/ghosts.ts`, cloned memorial records and the `state.lifecycle.memorials` map immutably before appending ghost visit entries.
   - Added regression test `tests/domain/lifecycle/regression_remediation.test.ts #2`.
4. **REPRO-06 (Tick Granularity Dependency in Hazard Warning Timers)**:
   - In `src/domain/lifecycle/hazards.ts`, established warning onset relative to elapsed interval (`Math.max(0, currentSimMinute - elapsedSimMinutes)`), ensuring invariant death outcomes under micro vs macro simulation ticks.
   - Added regression test `tests/domain/lifecycle/regression_remediation.test.ts #3`.
5. **REPRO-07 (Double Simulation Clock Advance)**:
   - Removed clock mutation from `src/domain/lifecycle/index.ts`. `advanceLifecycle` processes ticks at the current boundary established by core engine.
   - Added regression test `tests/domain/lifecycle/regression_remediation.test.ts #4`.
6. **REPRO-08 (Divergent PRNG Dialect & Domain Type Shadowing)**:
   - Implemented canonical `SeededRng` Mulberry32 + SplitMix32 adapter in `src/domain/lifecycle/rng.ts`.
   - Updated `src/domain/lifecycle/genetics.ts` to use canonical `nextRng`.
   - Aligned `CatRecord` with canonical `CareerOutfit`, `baseAppearance`, `isAtWork`.
   - Added regression test `tests/domain/lifecycle/regression_remediation.test.ts #5`.

## Exact Files Modified / Created
- `src/domain/lifecycle/rng.ts` (created)
- `src/domain/lifecycle/types.ts`
- `src/domain/lifecycle/genetics.ts`
- `src/domain/lifecycle/birth.ts`
- `src/domain/lifecycle/ghosts.ts`
- `src/domain/lifecycle/hazards.ts`
- `src/domain/lifecycle/index.ts`
- `tests/domain/lifecycle/birth.test.ts`
- `tests/domain/lifecycle/ghosts.test.ts`
- `tests/domain/lifecycle/lifecycle_comprehensive.test.ts`
- `tests/domain/lifecycle/regression_remediation.test.ts` (created)
- `tests/domain/lifecycle/composed_integration.test.ts` (created)
- `work/lifecycle/INTEGRATION.md`
- `work/lifecycle/PROGRESS.md` (created)

## Verification Evidence
Command executed:
```bash
bun test tests/domain/lifecycle
```
Results:
- 29/29 tests passing cleanly across 7 files (0 failures).

## Remaining Integration Gates
1. Engine orchestrator composition in `cats-engine` to run central tick loop.
2. Replacing local `src/domain/lifecycle/rng.ts` with direct import from `cats-engine` once engine core repairs merge.
