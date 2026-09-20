# Social Domain Subsystem Progress Ledger (`work/social/PROGRESS.md`)

## Task Ownership & Context
- **Worker**: AGY Gemini 3.8 Flash High
- **Subsystem**: Social & Moo-Moo Domain Subsystem
- **Repository Worktree**: `/Users/russell/.codex/worktrees/cats-social/Cats`
- **Baseline Evaluated**: `3ad4d91` (feat: import Jules social and Moo-Moo subsystem for review)
- **Review Verdict Remediated**: Independent Review `REVIEW.md` (Social score 72/100 -> remediated to composable quality)

## Defects Fixed & Implemented Solutions
1. **REPRO-01 (Incompatible Pregnancy Schema)**:
   - Added canonical `parentIds: [gestatingCatId, otherParentId]`, `startedAtSimMinute`, `dueAtSimMinute`, `reservedSlots`, `conceptionEventId` to `PregnancyRecord` in `src/domain/social/types.ts`.
   - Updated `advanceSocial` to output canonical fields while preserving backwards-compatible aliases (`motherId`, `fatherId`, `damId`, `sireId`, `litterSize`).
2. **REPRO-02 (Permanent Capacity Leak via Unfiltered Resolved Pregnancies)**:
   - Updated `advanceSocial` capacity calculation in `src/domain/social/advance.ts`: filters out resolved pregnancies (`!p.resolved`) when summing reserved slots.
   - Added regression test `social.test.ts #10` verifying subsequent conception succeeds after prior birth.
3. **REPRO-03 (Non-Deterministic Memory IDs via Date.now())**:
   - Replaced wall-clock `Date.now()` in `src/domain/social/relationships.ts#L120` with deterministic ID `mem_${catId}_${memory.simMinute}_${memory.type}_${existingMemories.length + 1}`.
   - Added regression test `social.test.ts #11` verifying identical IDs across wall-clock time delays.
4. **REPRO-04 (Ghost Moo-Moo Completion on Action Interruption)**:
   - In `src/domain/social/advance.ts`, added checks for `initiator.currentAction?.id !== action.id || target.currentAction?.id !== action.id`.
   - When a cat is redirected to another action (such as eating or sleeping), the in-progress action is cancelled, partner's `currentAction` is cleared, and no conception occurs.
   - Added regression test `social.test.ts #12`.
5. **REPRO-07 (Double Simulation Clock Advance)**:
   - Removed clock mutation from `src/domain/social/advance.ts`. Module advance treats `state.clock` as authoritative and advances domain simulation at the end-of-step clock boundary.
   - Added regression test `social.test.ts #13`.
6. **REPRO-08 (Divergent PRNG Dialect & Domain Type Shadowing)**:
   - Replaced private Mulberry32 generator in `src/domain/social/rng.ts` with canonical `SeededRng` Mulberry32 + SplitMix32 implementation matching `cats-engine/Cats/src/domain/rng.ts`.
   - Added state serialization and draw counting matching engine's `RngStateData.serializedState`.
   - Aligned `CatRecord` with canonical `CareerOutfit`, `baseAppearance`, `isAtWork`.
   - Added regression test `social.test.ts #14`.

## Exact Files Modified
- `src/domain/social/rng.ts`
- `src/domain/social/types.ts`
- `src/domain/social/relationships.ts`
- `src/domain/social/advance.ts`
- `tests/domain/social/social.test.ts`
- `work/social/INTEGRATION.md`
- `work/social/PROGRESS.md`

## Verification Evidence
Command executed:
```bash
bun tests/domain/social/social.test.ts
```
Results:
- 14/14 tests passing cleanly (0 failures).

## Remaining Integration Gates
1. Engine orchestrator composition in `cats-engine`: wiring `advanceSocial` and `reduceSocial` into central world tick loop.
2. Replacing local `src/domain/social/rng.ts` adapter with shared import from `src/domain/rng.ts` once engine repairs land.
