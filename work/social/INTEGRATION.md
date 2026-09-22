# Social Subsystem Integration Specification (`work/social/INTEGRATION.md`)

## 1. Ownership & Scope
- **Owner**: Social Domain Worker (Jules)
- **Owned Directories**:
  - `src/domain/social/**`
  - `tests/domain/social/**`
  - `work/social/**`

## 2. Exports from `src/domain/social/index.ts`
The module exports the following typed functions and interfaces for the shared engine orchestrator:

```ts
export type {
  SocialCommand,
  SocialSubsystemState,
  SocialRelationship,
  SocialMemory,
  InProgressSocialAction,
  InteractionType
} from './types';

export {
  isSocialCommand,
  initializeSocialState,
  reduceSocial
} from './reducer';

export { advanceSocial } from './advance';
export { checkMooMooEligibility, checkGeneralSocialEligibility } from './readiness';
export { pairKey, getRelationship, updateRelationshipScore } from './relationships';
```

## 3. Typed Schema Extensions (`SocialSubsystemState`)
The initial engine contract provided a minimal `recentInteractions` array. This worker extends `SocialSubsystemState` with full two-sided relationships, memories, pair cooldowns, and in-progress action tracking:

```ts
export interface SocialSubsystemState {
  recentInteractions: Array<{ fromId: CatId; toId: CatId; type: string; simMinute: number }>;
  relationships: Record<string, SocialRelationship>; // Keyed by canonical pairKey `${catA}:${catB}`
  memories: Record<CatId, SocialMemory[]>;            // Keyed by CatId, bounded max 20 memories per cat
  inProgressActions: InProgressSocialAction[];        // In-flight actions such as Moo-Moo
  pairCooldowns: Record<string, number>;               // Keyed by pairKey, value is simMinute when available
  completedActionIds: string[];                        // Completed command IDs for idempotency
}

export interface SocialRelationship {
  friendship: number; // -100 to 100
  romance: number;    // 0 to 100
  isLove: boolean;    // romance >= 70 && friendship >= 40
  isRival: boolean;   // friendship <= -40
  isFriend: boolean;  // friendship >= 50
  interactionCount: number;
  lastInteractionSimMinute: number;
}

export interface SocialMemory {
  id: string;
  otherCatId: CatId;
  type: 'first_kiss' | 'argument' | 'moo_moo_completed' | 'became_friends' | 'became_rivals' | 'play_session';
  summary: string;
  simMinute: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface InProgressSocialAction {
  id: string;
  type: 'moo_moo' | 'social_interaction';
  interactionType?: InteractionType;
  initiatorId: CatId;
  targetId: CatId;
  startSimMinute: number;
  totalDurationMinutes: number;
  elapsedMinutes: number;
  source: 'player' | 'autonomous';
}
```

## 4. Commands Handled (`SocialCommand`)
- `SUGGEST_MOO_MOO`: Player-directed proposal. Cannot override partner decline.
- `PROPOSE_MOO_MOO`: Autonomous or player-directed romance proposal.
- `SOCIAL_INTERACT`: Immediate social action (`sniff`, `nuzzle`, `play_chase`, `hiss`, `chat`, `groom_other`).
- `CANCEL_SOCIAL_ACTION`: Player or system cancellation of in-progress social action.

## 5. Domain Events Emitted
- `MOO_MOO_STARTED`: Dispatched when a Moo-Moo action begins.
- `MOO_MOO_COMPLETED`: Dispatched when Moo-Moo duration completes.
- `MOO_MOO_DECLINED`: Dispatched when proposal or completion readiness fails. **Zero RNG rolls drawn.**
- `MOO_MOO_CANCELLED`: Dispatched when action is interrupted by death, move-out, or explicit cancel.
- `PREGNANCY_CONCEIVED`: Dispatched when eligible completion passes 25% conception draw. Creates `PregnancyRecord` in `state.lifecycle.pregnancies`.
- `SOCIAL_INTERACTION_COMPLETED`: Dispatched for general social interactions.

## 6. Mutual Readiness & Capacity Rules
1. **Readiness Matrix**: Both cats must be living adults (`lifeStage === 'adult'`), no close family links (mother/father/siblings), mood >= 60, energy >= 35, social >= 35, health >= 35, no active illness or pregnancy, not working, pair cooldown expired, and mutual love (`romance >= 70`, `friendship >= 40`).
2. **Decline & RNG Purity**: Any decline (player or autonomous) consumes **exactly zero RNG rolls**.
3. **Capacity Limit (8 living + reserved)**:
   - At capacity 8 (living + reserved = 8): Romantic action completes, boosts relationship/romance, records memories, but **makes zero conception draws**.
   - Available capacity > 0: Makes **exactly one 25% conception draw**. On success, litter size (1-3) is clamped to `Math.min(litterSize, 8 - livingCount - reservedSlots)`.
4. **Lifecycle Handoff**: Gestation is set to 3 sim days (4320 sim minutes). Creates a `PregnancyRecord` in `lifecycle.pregnancies` for the lifecycle worker to process when due.

## 7. Verification Evidence
Run test suite with:
```bash
npx tsx tests/domain/social/social.test.ts
```
All 9 test suites pass cleanly.
