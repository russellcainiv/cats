# Cats Game Engine Implementation Progress

## Task & Ownership
- **Task**: Canonical Engine Integration and Remaining Core Repairs (Mission 03)
- **Worktree**: `/Users/russell/.codex/worktrees/cats-engine/Cats`
- **Branch**: `codex/feat-game-engine-20260920`
- **Owner**: AGY Gemini 3.8 Flash High (Engine Owner)
- **Mission File**: `work/orchestrator/core-integration-mission.md`
- **Transcript / Prompt Source**: User instruction executing `work/orchestrator/core-integration-mission.md`
- **Independent Critic Evidence**:
  - `work/reviews/core-round2/review.json`, `work/reviews/core-round2/REVIEW.md`, `work/reviews/core-round2/reproductions.test.ts` (READ ONLY - preserved without modification)
  - `/Users/russell/.codex/worktrees/cats-lifecycle/Cats/work/reviews/social-lifecycle-round2/review.json` (READ ONLY)
  - `/Users/russell/.codex/worktrees/cats-building/Cats/work/reviews/building/REVIEW.md` (READ ONLY)

## Git Custody & Producer Boundaries
- Branch: `codex/feat-game-engine-20260920`
- Base commit: `af40777` (HEAD)
- Imported Module Commits:
  - social: `6983dec`
  - lifecycle: `fb4fc2d`
  - economy: `6e3ac14`
  - neighborhood: `22606f9`
  - building: `1ff7b0b`
- **Building Producer Custody Note**: `src/domain/building/**` is currently held at `1ff7b0b`. Producer repair is running in `cats-building`. We do NOT modify `src/domain/building/**` here until a new committed repair exists in `cats-building` after `1ff7b0b`, at which point we cherry-pick only that commit into this worktree and assume integration ownership.
- Owned Paths:
  - `src/domain/state.ts`
  - `src/domain/commands.ts`
  - `src/domain/simulation.ts`
  - `src/domain/selectors.ts`
  - `src/domain/invariants.ts`
  - `src/domain/rng.ts`
  - `src/domain/scenarios.ts`
  - `src/domain/core/**`
  - `src/domain/social/**`
  - `src/domain/lifecycle/**`
  - `src/domain/economy/**`
  - `src/domain/neighborhood/**`
  - `tests/domain/**`
  - `work/engine/**`

## Integration and Repair Gates
1. [ ] Gate 1: Repair 5 concrete findings from Core Round 2 Review (`review.json`):
   - CORE-R2-01: Guard `elapsedSimMinutes` with finite check in `advance()` to prevent NaN clock corruption.
   - CORE-R2-02: Prevent in-place partner `CatRecord` mutation during autonomous Moo-Moo completion.
   - CORE-R2-03: Canonicalize JSON key order in idempotency hashing to prevent false retry rejections.
   - CORE-R2-04: Return structured `INVARIANT_VIOLATION` code and details on invariant failure.
   - CORE-R2-05: Parity between directed and autonomous Moo-Moo need satisfaction and interaction timestamps.
2. [ ] Gate 2: Resolve 4 Social & Lifecycle Round 2 observations:
   - OBS-01: Kitten appearance inheritance across canonical fields (`breed`, `bodyType`, `primaryColor`, `pattern`, `baseAppearance`).
   - OBS-02: `TRIGGER_BIRTH` domain guard rejecting premature gestation before `dueAtSimMinute`.
   - OBS-03: Canonical `motherId`/`fatherId` kinship checks with validated migration for legacy `family` fields.
   - OBS-04: Single unified RNG seed fallback contract (default `1337`).
3. [ ] Gate 3: Central Schema & Extension Unification:
   - Unify `state.ts`, `commands.ts`, and subsystem extensions without duplicate definitions or `any` shortcuts.
   - Eliminate duplicated prototype logic in `src/domain/core/subsystems.ts` in favor of real module entry points.
   - Canonical single RNG stream and single authoritative clock per simulation step.
4. [ ] Gate 4: Pregnancy & Household Capacity Contract:
   - Active `lifecycle.pregnancies` authority (`parentIds: [gestatingCatId, otherParentId]`, `startedAtSimMinute`, `dueAtSimMinute`, `reservedSlots`, `conceptionEventId`).
   - Atomic reservation removal on birth or cancellation; ancestry preserved separately.
   - Shared 8 living + reserved slots invariant across all systems.
5. [ ] Gate 5: Subsystem Integrations:
   - Economy: all 3 careers / 3 ranks, 2 hobbies, 3 crops, 3 recipes, 18 real goal evaluators, earned/free-build provenance, once-only settlements, shift availability, career clothing.
   - Neighborhood: 7 lots / 8 persistent NPCs, shop, visits, travel, adoption / adult transfers sharing state & active pregnancy logic.
6. [ ] Gate 6: GameView & Presentation Integration:
   - Expose complete typed serializable `GameView` conforming to `cats-world` contract.
   - Publish `work/engine/INTEGRATION.md` with documented imports, command examples, and migration helpers.
7. [ ] Gate 7: Building Subsystem Producer Check & Final Cherry-Pick:
   - Check `cats-building` HEAD for new committed repair.
   - Cherry-pick repair commit, normalize building types into central schema, eliminate any harness dependencies.
8. [ ] Gate 8: Verification & Regression Suites:
   - Strict TypeScript compilation across all domain files.
   - Vitest / Bun test suites: core, economy, social, lifecycle, neighborhood, building, and full-chain composition tests.

## Current Action
- Step 1: Repair CORE-R2-01, CORE-R2-02, CORE-R2-03, CORE-R2-04, and CORE-R2-05 in core engine.
