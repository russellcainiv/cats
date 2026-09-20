# Social Subsystem Integration Specification (`work/social/INTEGRATION.md`)

## 1. Ownership & Scope
- **Owner**: Social Domain Worker (AGY Gemini 3.8 Flash High)
- **Owned Worktree**: `/Users/russell/.codex/worktrees/cats-social/Cats`
- **Owned Directories**:
  - `src/domain/social/**`
  - `tests/domain/social/**`
  - `work/social/**`

## 2. Module Exports (`src/domain/social/index.ts`)
The module exports the following typed functions and interfaces for the shared engine orchestrator:

```ts
export type {
  SocialCommand,
  SocialSubsystemState,
  SocialRelationship,
  SocialMemory,
  InProgressSocialAction,
  InteractionType,
  PregnancyRecord,
  CareerOutfit,
  CatRecord,
  WorldState,
  CommandContext,
  CommandResult,
} from './types';

export {
  isSocialCommand,
  initializeSocialState,
  reduceSocial
} from './reducer';

export { advanceSocial } from './advance';
export { checkMooMooEligibility, checkGeneralSocialEligibility } from './readiness';
export { pairKey, getRelationship, updateRelationshipScore } from './relationships';
export { SeededRng, createRngAdapter, toRngStateData, nextRandomFloat } from './rng';
```

## 3. Typed Schema Alignments & Extensions
### Canonical Pregnancy Schema
Aligined with `cats-engine/src/domain/state.ts` and the parallel orchestrator ruling:
```ts
export interface PregnancyRecord {
  id: PregnancyId;
  parentIds: [CatId, CatId]; // [gestatingCatId, otherParentId]
  startedAtSimMinute: number;
  dueAtSimMinute: number;
  reservedSlots: number;
  conceptionEventId: string;
  // Compatibility aliases
  motherId?: CatId;
  fatherId?: CatId;
  damId?: CatId;
  sireId?: CatId;
  conceptionSimMinute?: number;
  conceivedAtSimMinute?: number;
  dueSimMinute?: number;
  litterSize?: number;
  resolved?: boolean;
  rngSeedAtConception?: number;
}
```

### CatRecord Base Fields & Career Outfit Preservation
Preserves `careerOutfit?: CareerOutfit | null`, `baseAppearance?: CatAppearance`, `isAtWork?: boolean`, and `family` refs.

### Deterministic PRNG (`src/domain/social/rng.ts`)
Implements the engine's canonical Mulberry32 + SplitMix32 algorithm (`SeededRng`) with state serialization, draw tracking, and snapshot compatibility.

## 4. Commands Handled (`SocialCommand`)
- `SUGGEST_MOO_MOO`: Player-directed proposal. Cannot override partner decline.
- `PROPOSE_MOO_MOO`: Autonomous or player-directed romance proposal.
- `SOCIAL_INTERACT`: Immediate social action (`sniff`, `nuzzle`, `play_chase`, `hiss`, `chat`, `groom_other`).
- `CANCEL_SOCIAL_ACTION`: Player or system cancellation of in-progress social action.

## 5. Domain Events Emitted
- `MOO_MOO_STARTED`: Dispatched when a Moo-Moo action begins.
- `MOO_MOO_COMPLETED`: Dispatched when Moo-Moo duration completes.
- `MOO_MOO_DECLINED`: Dispatched when proposal or completion readiness fails. **Zero RNG rolls drawn.**
- `MOO_MOO_CANCELLED`: Dispatched when action is interrupted by death, move-out, redirection, or cancel.
- `PREGNANCY_CONCEIVED`: Dispatched when eligible completion passes 25% conception draw. Creates canonical `PregnancyRecord` in `state.lifecycle.pregnancies`.
- `SOCIAL_INTERACTION_COMPLETED`: Dispatched for general social interactions.

## 6. Review Defects Resolved
1. **REPRO-01 (Pregnancy Schema)**: Conceived pregnancies output `parentIds: [gestatingCatId, otherParentId]`, `startedAtSimMinute`, `dueAtSimMinute`, `reservedSlots`, `conceptionEventId`, with backwards-compatible aliases (`motherId`, `fatherId`, `damId`, `sireId`).
2. **REPRO-02 (Capacity Leak)**: `advanceSocial` filters out resolved pregnancies when summing reserved slots (`!p.resolved`), guaranteeing that completed births and released slots immediately restore available household capacity.
3. **REPRO-03 (Non-Deterministic Memory IDs)**: Replaced `Date.now()` with deterministic ID format `mem_${catId}_${memory.simMinute}_${memory.type}_${count}`.
4. **REPRO-04 (Ghost Action Completion)**: `advanceSocial` verifies `initiator.currentAction?.id === action.id && target.currentAction?.id === action.id`. If either cat is redirected to another action (such as eating or sleeping), the paired action is immediately cancelled and cleared.
5. **REPRO-07 (Double Clock Advance)**: `advanceSocial` preserves `state.clock` as authoritative from the core simulation loop and does not mutate `clock.simMinute`.
6. **REPRO-08 (PRNG Dialect Incompatibility)**: Adopted canonical engine `SeededRng` Mulberry32 algorithm and `RngStateData.serializedState`.

## 7. Verification Evidence
Run focused social unit and regression tests with:
```bash
bun tests/domain/social/social.test.ts
```
All 14 test suites pass cleanly:
1. Mutual readiness matrix verified
2. Decline and RNG purity verified
3. At-capacity completion verified
4. Capacity-clamped conception reservation verified
5. Idempotency verified
6. Deterministic replay verified
7. Autonomy and player suggestion parity verified
8. Pair cooldown enforcement verified
9. Interrupted social action settlement verified
10. REPRO-02 Regression verified: resolved pregnancies do not leak capacity
11. REPRO-03 Regression verified: memory IDs are deterministic without Date.now()
12. REPRO-04 Regression verified: redirection clears paired action and prevents ghost completion
13. REPRO-07 Regression verified: advanceSocial preserves authoritative clock
14. REPRO-08 Regression verified: canonical SeededRng adapter in social

## 8. Remaining Integration Gates
- Core engine orchestration harness in `cats-engine` to compose `advanceSocial` with central state dispatch.
- Shared imports directly from `src/domain/state.ts` and `src/domain/rng.ts` once core repairs merge.
