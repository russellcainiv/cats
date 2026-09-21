# Cats implementation contracts

This document is an index to the detailed behavioral contracts in [Architecture](architecture.md). All technical choices are proposed engineering defaults, not quotes of founder decisions. No application code exists at planning completion.

## Proposed file responsibilities

| Path | Responsibility |
|---|---|
| src/app/game/page.tsx | Authenticated game entry; client renderer is mounted below this boundary. |
| src/features/world/GameCanvas.tsx | Client-only Pixi lifecycle, input translation, resizing and renderer recovery. |
| src/features/ui/GameShell.tsx | Accessible DOM HUD, dialogs, mobile sheets and keyboard routes. |
| src/domain/state.ts | Versioned WorldState and stable IDs; no rendering or network imports. |
| src/domain/commands.ts | Typed GameCommand union and atomic dispatch entrypoint. |
| src/domain/simulation.ts | Fixed-step advance, scheduling and persisted seeded RNG. |
| src/domain/selectors.ts | Read-only GameView for UI; rendering never changes the world. |
| src/domain/invariants.ts | Capacity, identity, inventory, money, ownership and pregnancy invariants. |
| src/features/saves/SaveCoordinator.ts | Local checkpoints, cloud revisions, lease heartbeat and conflict handling. |
| src/server/access.ts | Verified identity and private membership checks for every route. |
| src/server/saves.ts | Transactional revision/lease/idempotency checks and immutable recovery copies. |
| src/content/balance.ts | Fixed engineering constants and content data; no player lifespan option. |
| tests/support/scenario.ts | Browser fixture setup in test environments only. |
| tests/support/domain.ts | Deterministic domain scenario factory and clock control. |
| tests/e2e/*.spec.ts | Real browser command workflows and reload assertions. |
| tests/integration/*.spec.ts | Real test database/auth boundary, transactions and owner isolation. |

## Exact integration names

```ts
export type CommandResult =
  | { ok: true; state: WorldState; events: DomainEvent[] }
  | { ok: false; state: WorldState; error: { code: string; message: string } };
export type CommandContext = { actorId: string; commandId: string };
export function dispatch(state: WorldState, command: GameCommand, context: CommandContext): CommandResult;
export function advance(state: WorldState, elapsedSimMinutes: number): WorldState;
export function selectView(state: WorldState): GameView;
```

These are declarations to implement, not working code. WorldState contains stable household/cat/lot/object IDs, simMinute, persisted RNG state, queued actions, relationship/family records, capacity reservations, wallet/inventory, careers, businesses, memories and deaths. The architecture document specifies the fields and transitions. Feature modules extend the typed command union and schema deliberately; they cannot mutate state from a React effect or Pixi animation callback.

## Server authority boundary

CommandContext is a local simulation input, not authorization. Never accept it as proof of identity or writer ownership. The save route first obtains verified identity from the auth session, checks private membership and household ownership, and then performs the lease/revision/idempotency checks in one database transaction. Only that server layer may commit a cloud snapshot.

```ts
export type SaveRequest = {
  requestId: string;
  expectedRevision: number;
  lease: { sessionId: string; epoch: number };
  envelope: SaveEnvelope;
};
export type SaveReceipt = {
  requestId: string;
  revision: number;
  checksum: string;
};
```

The household ID comes from the route, authenticated subject from the server, and lease ownership from a stored server record. Compare the request's epoch/session/expiry to that record and its expectedRevision to the stored revision. A matching previously committed requestId returns its stored receipt before a new write; a reused requestId with a different payload is rejected. Ownership is always checked before an idempotent receipt is returned. A takeover increments the stored epoch and makes all old writer requests fail with 409. The client cannot rescue a rejected write by changing an actorId, ownerId or leaseEpoch inside its JSON.

## Persisted facts used by acceptance tests

Add `GET /api/households/[id]/view`, authenticated and owner-checked like the save route. It reads the latest COMMITTED cloud snapshot and applies the production `selectView` projection. It accepts no fixture/expected-result data and does not read browser state. This is also the read-only resume/observer projection used by a second device, not a test-result endpoint. Return `{ revision, checksum, view }`; a new browser context must see the same values after an acknowledged save.

GameView exposes versioned, named facts for user-visible state: household identity/name/livingCount/reservedSlots, selected-cat details, cats by stable ID, lot topology and objects, wallet, inventory, skills, careers, goals, relationships, pregnancies, family, deaths, memorials, businesses, tutorial and settings. Runtime-only selection need not persist; commands in acceptance fixtures target stable IDs explicitly. The task's assertions below define exact projection keys to add and maintain, with typed tests for selectView against a real saved world. No selector may return a success constant based on the scenario name.

`openScenario(page, name)` returns `{ householdId: string }`. `readCommittedView(page, householdId)` performs a real authenticated GET of the view route and throws on non-200. Its generic type is `{ revision: number; checksum: string; view: GameView }`. `waitForCommit(page, householdId, previousRevision)` polls that route until revision increases or fails within ten seconds. The test setup loads initial data only once; ordinary reloads and new contexts must never reset the world. The user's normal session and cloud round-trip remain active in all browser checks.

Acceptance fixtures start paused except where the scenario explicitly exercises time. Before a stable checksum/reload assertion, pause through the actual game control and wait until the latest local state is cloud-acknowledged. Tests involving actions over time must resume, wait for the specified domain outcome, then pause and settle before reading the final view. The named fixture's catalog uses the prices and IDs shown in its test; its starting state cannot already contain the expected newly created object, payment or event. Never add an end-user control merely to satisfy a test label: adapt the test to the equivalent real action, such as selecting a world destination through the canvas or accessible interaction menu.

## Browser test seam

Implement `openScenario(page: Page, name: string): Promise<void>` in tests/support/scenario.ts. It creates a deterministic fixture in a dedicated test account through a test-only backend setup handler and opens the real game route. The name resolves a versioned fixture registry, not a mocked response. Production builds must not register this handler, expose fixture controls, or accept a fixture query parameter. Test authorization is checked server-side, not by hostname alone. Assertions use accessible roles for actions and a small stable set of test IDs for game state. A passing label test is a starting regression test, not proof of the whole ticket.

Domain tests invoke dispatch/advance with fixed seeds, then assert state, emitted events and invariants. Integration tests call real route handlers with test identities and an isolated database. Browser dogfooding proves renderer input, navigation, touch, audio and actual visual behavior which domain tests cannot establish.

## Commands to establish in the first ticket

- `npm run test:domain -- <file>`: Vitest, selected headless behavior tests.
- `npm run test:integration -- <file>`: isolated real-database route tests.
- `npm run test:e2e -- <file> --project=desktop`: focused Playwright browser case.
- `npm run test:e2e -- <file> --project=phone`: focused touch case.
- `npm run typecheck`, `npm run lint`, `npm run build`: repository-only validation.
- `python3 scripts/validate_plan.py all`: planning artifact checks, available now.

The application commands above do not exist yet. Ticket 01 must create and verify them. Never report them passing from this planning package. Heavy full suites should run in CI or a dedicated validation environment; do not launch broad machine-wide tests or unsolicited app windows on the founder's working computer.

## Co-op implementation contracts (Requirement R26)

This section indexes the technical and behavioral contracts for the Private Family Co-Op extension (Tasks 33–38).

### Proposed Co-Op File Responsibilities

| Path | Responsibility |
|---|---|
| `src/features/coop/CoopCoordinator.ts` | Client SSE lifecycle, `Last-Event-ID` cursor resumption, 10s host lease heartbeat/claim/release. |
| `src/features/coop/CoopHUD.tsx` | Presence avatars, partner viewport panning, cooperative pause/resume banner. |
| `src/features/coop/ReticleRenderer.ts` | Coral (`#FF7A59`) and Lavender (`#A78BFA`) multi-actor selection rings on Pixi canvas. |
| `src/server/coop-transport.ts` | Next.js SSE route handler, keep-alive pings, PostgreSQL `coop_commands` stream and cursor replay. |
| `src/server/coop-commands.ts` | Monotonic `cmd_seq` insertion, command idempotency validation, member authorization. |
| `src/server/coop-leases.ts` | Dynamic 10s simulation lease management, atomic CAS claims, and timing leader tick validation. |
| `src/server/invites.ts` | 256-bit crypto invite token generation, SHA-256 hashing at rest, zero-PII redemption, and revocation. |

### Co-Op Integration Types

```ts
export type CoopMemberRole = 'owner' | 'family_member';
export type PastelColorTheme = 'coral' | 'lavender' | 'mint' | 'amber';

export interface CoopMember {
  userId: string;
  displayName: string;
  role: CoopMemberRole;
  colorTheme: PastelColorTheme;
  joinedAt: string;
}

export interface CoopPresenceRecord {
  userId: string;
  displayName: string;
  role: CoopMemberRole;
  colorTheme: PastelColorTheme;
  selectedCatId?: string;
  isActive: boolean;
  isHost: boolean;
  lastHeartbeat: string;
}

export interface CoopCommandRecord {
  seq: number;
  actorId: string;
  commandId: string;
  type: string;
  payload: unknown;
  clientTime: number;
}
```

### Co-Op Server Authority, Reducer & Transport Contracts

1. **Ephemeral Container Transport (No In-Memory Broadcast)**:
   - Serverless instances on Vercel are ephemeral and stateless. Container A (holding SSE connection) and Container B (processing POST command) do not share memory.
   - The SSE route handler `GET /api/households/[id]/coop/stream` executes an asynchronous generator loop over PostgreSQL:
     `SELECT * FROM coop_commands WHERE household_id = $id AND cmd_seq > $lastSeen ORDER BY cmd_seq ASC LIMIT 50`.
   - Bounded polling cadence: 250ms–500ms between database checks.
   - **Connection Pool Bounds & Cancellation**: Queries use pooled client connections with strict connection timeouts and pool concurrency limits. When the client disconnects, `req.signal.onabort` immediately cancels pending queries, terminates the poll loop, and closes the stream with zero leaking connections.
   - **Cursor Reconnection & Pruning Fallback**: Reconnecting `EventSource` passes `Last-Event-ID: <cmd_seq>`. If `Last-Event-ID` has been compacted in `coop_commands` (> 15 minutes old), the server emits `event: snapshot_reload` with the full current snapshot and cursor sequence, ordering snapshot state before resume events.
   - **Vercel Platform Duration**: Function execution durations can be configured up to plan limits (e.g. 300 seconds on Pro with Fluid Compute, 60 seconds on Hobby). Standard SSE streams utilize ~55-second bounded lifecycles with transparent browser auto-reconnection via `EventSource`. WebSockets are natively supported on Vercel; SSE + HTTP POST is selected for standard HTTP infrastructure, built-in reconnection, and stateless horizontal scaling.

2. **Server-Side Command Reduction & Idempotency**:
   - `POST /api/households/[id]/coop/command` executes canonical `dispatch(currentWorldState, command, actorContext)` server-side within a PostgreSQL transaction holding an exclusive lock on `households` (`SELECT ... FOR UPDATE`).
   - The server is the sole state authority; client-authored replacement states are rejected with `400 Bad Request`.
   - In the same transaction, the server atomically persists:
     1. Updated `snapshots` (`world`, incremented `revision`).
     2. Monotonic `coop_commands` event row (`cmd_seq BIGSERIAL`).
     3. Durable `command_receipts` entry (`client_command_id`, `actor_seq`, `status`, `response_payload`).
   - Writes are visible to the SSE query loop only after transaction commit. Any error rolls back all changes with zero half-applied state.
   - `POST /api/households/[id]/coop/tick` executes canonical `advance(worldState, dt)` server-side, scheduled only by the designated host timing leader with valid non-expired lease.

3. **Caretaker Slot Profiles & Member Revocation Custody**:
   - Household cats are partitioned between two stable caretaker slot profiles: **Profile Alpha** (Owner) and **Profile Beta** (Invitee), each capped at 4 living/reserved cats (8 total in household).
   - Revoking a family member account terminates their session and closes SSE streams, but **NEVER deletes their cats or silently moves them into the owner's slots**.
   - Profile Beta cats remain in Profile Beta; the active Owner cares for them under the working **SharedCare** default.
   - Rebinding an invitee to Profile Beta re-attaches that player to the existing 4-cat roster without expanding household capacity beyond 8.
   - Explicit `REASSIGN_CAT_CUSTODY` command (`POST /api/households/[id]/cats/[id]/reassign`) validates that destination profile has capacity (`livingCount + reservedSlots < 4`). Reassigning a gestating parent atomically moves the reserved litter slot along with the parent, requiring destination capacity for both; otherwise rejected with `422 Unprocessable Entity`.
   - Legacy saves with up to 8 cats migrate by assigning cats 1–4 to Profile Alpha and cats 5–8 to Profile Beta without losing or rerolling any cat.

4. **Command Log Compaction vs. Durable Idempotency Receipts**:
   - Ephemeral `coop_commands` are pruned after 15 minutes once committed into snapshots (`created_at < NOW() - INTERVAL '15 minutes' AND cmd_seq <= snapshot_cmd_seq`).
   - `command_receipts` tracks monotonic per-actor sequences (`actor_seq`). If an actor submits a command with `actor_seq <= min_retained_seq`, the server returns explicit `409 Conflict` (`EXPIRED_COMMAND_SEQUENCE (needs resync)`), never silently executing it as a new command.

5. **Dynamic Host Lease & Failover Timing**: `sim_leases` enforces a 10-second TTL with 3-second heartbeats. Graceful release enables peer takeover in < 1 second; abrupt drop failover wait is 10–12 seconds, showing a calming reconnecting status pill and resuming simulation from the last committed server revision.
6. **Zero Unattended Progression**: If no active players are connected, no client holds an active lease and 0 tick commands are accepted, advancing exactly 0 sim minutes. Recovery loads the exact last committed state revision without wall-clock catch-up (R09).
7. **Child-Safe Secret Capabilities**: Invites use 256-bit cryptographically secure tokens, hashed at rest (`token_hash = sha256(token)`), single-use (`max_uses = 1`), 72-hour TTL. No child PII (DOB, age, school, phone, email) is collected. No external invitations are sent. Rejoin uses authenticated session cookies without re-pasting tokens.
8. **Preserve Single-Owner Unique Constraint**: `idx_households_owner_unique` on `households.owner_id` is strictly preserved. Multi-member access is managed via `household_members`.

### Consolidated 21-Route Actor Permission Matrix

| # | Endpoint & Method | Anonymous | Allowlisted Non-Member | Family Member (`family_member`) | Primary Owner (`owner`) | Host Leader (Active Lease) | Failure Response |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | `POST /api/households` | 401 | 201 Created (Max 1) | 409 (Already in household) | 409 (Already owns household) | N/A | 401 / 403 / 409 |
| 2 | `GET /api/households` | 401 | 200 OK (Empty list) | 200 OK (Joined household) | 200 OK (Owned household) | 200 OK | 401 |
| 3 | `GET /api/households/[id]` | 401 | 403 Forbidden | 200 OK | 200 OK | 200 OK | 401 / 403 / 404 |
| 4 | `GET /api/households/[id]/view` | 401 | 403 Forbidden | 200 OK | 200 OK | 200 OK | 401 / 403 / 404 |
| 5 | `POST /api/households/[id]/save` | 401 | 403 Forbidden | 403 (Co-op reducer authoritative) | 403 (Co-op reducer authoritative) | 200 OK (Emergency snapshot) | 401 / 403 / 409 |
| 6 | `POST /api/households/[id]/lease` | 401 | 403 Forbidden | 403 (Single-player route only) | 200 OK (Single-player route) | N/A | 401 / 403 / 409 |
| 7 | `POST /api/households/[id]/recover` | 401 | 403 Forbidden | 403 Forbidden | 200 OK | 200 OK | 401 / 403 / 409 |
| 8 | `POST /api/households/[id]/export` | 401 | 403 Forbidden | 200 OK (Read save JSON) | 200 OK | 200 OK | 401 / 403 |
| 9 | `POST /api/households/[id]/restore` | 401 | 403 Forbidden | 403 Forbidden | 200 OK (Owner only) | 200 OK | 401 / 403 / 409 |
| 10 | `POST /api/households/[id]/invites` | 401 | 403 Forbidden | 403 Forbidden | 201 Created (Token issued) | Allowed | 401 / 403 |
| 11 | `POST /api/invites/redeem` | 200 OK (Valid token) | 200 OK (Valid token) | 409 (Already in household) | 409 (Already owner) | N/A | 401 / 404 / 410 |
| 12 | `POST /api/households/[id]/members/[id]/revoke` | 401 | 403 Forbidden | 403 Forbidden | 200 OK (Cannot revoke self) | Allowed | 401 / 403 / 400 |
| 13 | `GET /api/households/[id]/coop/stream` | 401 | 403 Forbidden | 200 text/event-stream | 200 text/event-stream | 200 text/event-stream | 401 / 403 |
| 14 | `POST /api/households/[id]/coop/command` | 401 | 403 Forbidden | 200 OK | 200 OK | 200 OK | 401 / 403 / 422 |
| 15 | `POST /api/households/[id]/coop/tick` | 401 | 403 Forbidden | 409 (Unless Host) | 409 (Unless Host) | 200 OK | 401 / 403 / 409 |
| 16 | `POST /api/households/[id]/coop/heartbeat` | 401 | 403 Forbidden | 409 (Unless Host) | 409 (Unless Host) | 200 OK | 401 / 403 / 409 |
| 17 | `POST /api/households/[id]/coop/lease/claim` | 401 | 403 Forbidden | 200 OK (If expired) / 409 | 200 OK (If expired) / 409 | 200 OK | 401 / 403 / 409 |
| 18 | `POST /api/households/[id]/coop/lease/release` | 401 | 403 Forbidden | 409 (Unless Host) | 409 (Unless Host) | 200 OK | 401 / 403 / 409 |
| 19 | `POST /api/households/[id]/coop/pause` | 401 | 403 Forbidden | 200 OK | 200 OK | 200 OK | 401 / 403 |
| 20 | `POST /api/households/[id]/coop/resume` | 401 | 403 Forbidden | 200 OK | 200 OK | 200 OK | 401 / 403 |
| 21 | `POST /api/households/[id]/cats/[id]/reassign` | 401 | 403 Forbidden | 200 OK (Custody transfer) | 200 OK (Custody transfer) | Allowed | 401 / 403 / 422 |
| * | `POST /api/test/*` (Diagnostic hooks) | 404 Not Found | 404 Not Found | 404 Not Found | 404 (Disabled in prod) | 404 (Disabled in prod) | 404 (Gated by secret & dev) |

## Expanded content contracts (Requirements R27–R30, Tasks 39–42)

### Proposed File Responsibilities

| Path | Responsibility |
|---|---|
| `src/domain/lifecycle/genetics.ts` | Percentage-based appearance and trait inheritance, same-parent value aggregation, dynamic weight redistribution, deterministic PRNG sequence. |
| `src/domain/lifecycle/snapshots.ts` | Conception parent genetics snapshot capture, gestation lifecycle management, carrier termination. |
| `src/features/art/AssetManager.ts` | Reusable GPT Image sprite sheets and texture atlases, PixiJS container layering, fallback handling. |
| `src/domain/dex/cat-dex.ts` | Comprehensive cat catalog (TICA/CFA domestic, wild, fantasy), exploration encounter scheduler, persistent befriending. |
| `src/features/animation/FelineAnimationController.ts` | Feline-adapted career/hobby animations (paw kneading, digging, dabbing, basket carrying) and natural instinct behaviors (loafing, box napping, grooming, zoomies). |

### Genetics & Inheritance Types (R27, Task 39)

```ts
export interface InheritanceOddsConfig {
  policyId: 'weighted_novel' | 'strict_parents';
  weightParentA: number; // 0.45 default
  weightParentB: number; // 0.45 default
  weightNovel: number;   // 0.10 default
}

export interface ParentGeneticsSnapshot {
  catId: string;
  name: string;
  baseAppearance: CatAppearance;
  traits: PersonalityTrait[];
  generation: number;
  ownerMemberId: 'mom' | 'daughter';
}

export interface FeatureProvenance {
  feature: string;
  source: 'dam' | 'sire' | 'novel' | 'catalog_baseline';
  sourceParentId?: string;
  sourceValue: string | null;
  rolledValue: string;
  sourceProbability: number;
  effectiveOutcomeProbability: number;
  rngRoll: number;
}

export interface TraitProvenance {
  slot: 1 | 2;
  source: 'dam' | 'sire' | 'novel';
  sourceParentId?: string;
  trait: PersonalityTrait;
  conditionalProbability: number;
  rngRollSource: number;
  rngRollIndex: number;
}
```

### Rare Dex & Discovery Types (R29, Task 41)

```ts
export type CatRarityTier = 'common_domestic' | 'rare_domestic' | 'rare_wild' | 'mythical_fantasy';

export interface CatBreedDefinition {
  breedId: string;
  name: string;
  tier: CatRarityTier;
  standardSource: 'TICA' | 'CFA' | 'original_fantasy';
  allowedPatterns: string[];
  allowedColors: string[];
  description: string;
}

export interface ExplorationEncounterRecord {
  encounterId: string;
  lotId: string;
  catId: string;
  breedId: string;
  friendshipLevel: number;
  isBefriended: boolean;
  recruitedHouseholdId?: string;
  firstSeenSimMinute: number;
}
```

### Feline Activity & Animation Types (R30, Task 42)

```ts
export type FelineCareerAction = 'paw_knead_dough' | 'claw_dig_soil' | 'paw_dab_canvas' | 'mouth_carry_basket';
export type FelineInstinctAction = 'loaf' | 'box_nap' | 'head_bunt' | 'self_groom' | 'tail_flick' | 'zoomies' | 'toy_distraction';

export interface FelineActionState {
  catId: string;
  currentAction: FelineCareerAction | FelineInstinctAction | 'idle';
  equippedOutfitId?: string;
  actionStartedAtSimMinute: number;
  animationFrameIndex: number;
}
```

### Genetics Trait Invariants & Finite Selection (R27, Task 39)

1. **Canonical Two-Trait Invariant**:
   - Every cat in the world must possess **exactly two distinct personality traits**: `traits: [PersonalityTrait, PersonalityTrait]` where `traits[0] !== traits[1]`.
   - Grounded in canonical 10-trait catalog (`ALL_PERSONALITY_TRAITS`: `playful`, `lazy`, `affectionate`, `aloof`, `skittish`, `curious`, `glutton`, `vocal`, `mischievous`, `zen`).

2. **Pre-Conception Validation & Trait 2 Zero-Division Guard**:
   - Before Moo-Moo conception, the engine validates that combined parental traits satisfy $|P_A \cup P_B| \ge 2$.
   - Because canonical cats have 2 distinct traits, any valid parental pair guarantees at least 2 distinct traits between them ($|P_A \cup P_B| \ge 2$), guaranteeing mathematical feasibility.
   - If an invalid legacy cat attempts conception under Policy Beta (`strict_parents`, $w_{\text{novel}} = 0$), conception is rejected with an actionable user error (`CANNOT_CONCEIVE_INSUFFICIENT_PARENT_TRAITS`), prompting the player to assign a second trait via a repair dialog without silent rerolls.
   - For Trait 2, candidate pools exclude $T_1$ ($P_A' = P_A \setminus \{T_1\}, P_B' = P_B \setminus \{T_1\}$). If parental traits become empty:
     - Under Policy Alpha (45/45/10), weight redistribution denominator $w_B + w_{\text{novel}} = 0.10$. Trait 2 draws 100% from the novel domestic catalog with recorded provenance `{ source: 'novel_catalog_fallback', odds: 1.0 }`.
     - Under Policy Beta, pre-conception validation prevents reaching this state; defensive fallback records `'emergency_catalog_fallback'`, strictly preventing any `0/0` (`NaN`) crash.
   - Identical-trait parental aggregation: if Dam and Sire share a trait $T$, observable probability aggregates: $P(T) = 0.45 \times 0.5 + 0.45 \times 0.5 = 0.45$ (45%).

### Rare Cat Exploration, Schedule Pacing & Category Weights (R29, Task 41)

1. **Category Rarity Weights (Working Tuning Default)**:
   - Common Domestic: **70.0%** (`0.7000`)
   - Uncommon Domestic: **24.0%** (`0.2400`)
   - Rare Domestic: **5.0%** (`0.0500`)
   - Rare Wild: **0.75%** (`0.0075`) — 8 species (Caracal, Serval, Eurasian Lynx, Sand Cat, Pallas's Cat, Rusty-Spotted Cat, Snow Leopard, Clouded Leopard), ~0.09375% each.
   - Mythical Fantasy: **0.25%** (`0.0025`) — 8 forms (Moonlit Celestial, Starlight Shadow, Cloud-Weaver, Forest Whisper, Crystal Shimmer, Ember Hearth, Aurora Borealis, Blossom Spirit), ~0.03125% each.
   - Wild and fantasy are strictly the rarest encounter tiers, combined representing 1.0% of encounters.

2. **Active Simulation Time Pacing**:
   - Pacing uses **Active Simulation Time**: 1 real second = 1 sim minute. 1 sim day = 1,440 sim minutes (24 minutes active play).
   - Lot encounters schedule deterministically from `(household.seed, simDay, lotId)`.
   - Encounter window lasts **60 sim minutes** (60 real seconds of active play).
   - Pausing, tab backgrounding, or disconnecting freezes simulation delta at 0.00 sim minutes. Encounters **never** advance or reroll during offline or paused time.
   - Active encounters persist in `world.neighborhood.activeEncounters`. Entering, exiting, reloading, or viewing from device 2 inspects the same persisted encounter without rerolling.
   - Befriending is supported at full household capacity (8/8). Recruitment is an atomic action that verifies capacity before converting a befriended cat into a household pet.

---

## Lineage & hybrid naming contracts (Requirement R31, Task 43)

### Lineage Tree & Hybrid Naming Types

```ts
export interface LineageNode {
  catId: string;
  lineageId: string; // Immutable UUID
  parentAId: string | null;
  parentBId: string | null;
  nameAtConception: string;
  breedId: string;
  generationDepth: number; // 0 for founders, 1 for F1, etc.
  hybridName?: string;     // Coined hybrid breed name if parents differed
  appearanceSnapshot: CatAppearance;
  isGhost: boolean;
  deceasedAtSimMinute?: number;
}

export interface HybridRecipeDefinition {
  recipeKey: string; // sort([breedA, breedB]).join('x')
  hybridName: string;
  foundationBreeds: [string, string];
}

export interface FamilyTreeGraph {
  nodes: Record<string, LineageNode>; // catId -> LineageNode
  rootFounderIds: string[];
}
```

### Invariant Rules & Algorithms

1. **Deterministic Order-Independent Hybrid Naming**:
   - When parents of distinct breeds successfully give birth, compute recipe key: `sort([breedA, breedB]).join('x')`.
   - Coined hybrid breed names (e.g. `bengalxbirmingham` -> `"Bengaldoll"`, `bengalxragdoll` -> `"Ragdal"`, `persianxsiamese` -> `"Persimese"`, `mainecoonxscottishfold` -> `"Coonfold"`) generate deterministically at birth, never on unsuccessful romance.
   - Hybrid names do not erase foundation ancestry: both `hybridName` and original `breedId` remain inspectable.
   - Beyond F1, deeper generations use highest-percentage or foundation ancestry labels, strictly preventing unbounded hyphenation or infinite concatenation.
   - Hybrid generation does not unlock rare wild/fantasy discovery gates.

2. **Durable Lineage Graph & Cycle-Free DAG**:
   - `WorldState.lineage` stores immutable lineage nodes.
   - Death, memorialization, renaming, or caretaker reassignment never mutates ancestry history.
   - Cycle detection (`validateLineageDAG`) rejects any cyclical parentage before conception.

3. **Genealogical Relatedness Inbreeding Guards**:
   - Function `areCatsRelated(catAId, catBId, maxGenerations = 3)` traverses ancestor graph.
   - Romance is disallowed between parent-child, full/half siblings, and grandparent-grandchild, displaying gentle feedback: *"These cats are closely related family!"*.

---

## Expanded customization & furniture contracts (Requirement R32, Task 44)

### Catalog & Customization Types

```ts
export type RoomStyleCategory = 'cozy_cottage' | 'modern_cat' | 'whimsical_play' | 'rustic_garden';

export interface ExpandedFurnitureItem {
  id: string;
  displayName: string;
  category: 'seating' | 'sleep' | 'care' | 'play' | 'skills' | 'storage' | 'decor';
  style: RoomStyleCategory;
  width: number;
  height: number;
  costCoins: number;
  unlockRequirement?: string;
  needAffordance?: {
    needType: 'hunger' | 'comfort' | 'hygiene' | 'bladder' | 'energy' | 'social' | 'fun' | 'scratch';
    satisfactionRate: number;
  };
  assetKey: string;
  paletteVariants: string[];
}

export interface CustomizationPaletteRegistry {
  coatVariants: string[];     // 16 additional coat pattern variants
  eyeColors: string[];        // 8 eye color palettes
  accessories: string[];      // 12 wardrobe accessories (collars, bows, bandanas, bells)
  roomWallSwatches: string[]; // Reversible room wallpaper swatches
  roomFloorSwatches: string[];// Reversible room flooring swatches
}
```

### Invariant Rules & Content Architecture

1. **At Least 64 Usable Items Across 4 Room Styles**:
   - The expanded furniture catalog provides $\ge 64$ distinct items across Cozy Cottage, Modern Cat, Whimsical Play, and Rustic Garden.
   - Functional items include climbing wall shelves (Fun), sisal scratch lounges (Scratch + sofa durability protection), bubbling water fountains (Hydration/Thirst), heated cuddle beds (Comfort + Energy), puzzle feeders (Fun + Hunger), and ambient lamps.

2. **Decoupled Content Module & Adapter**:
   - Implemented in `src/content/furniture/` and `src/domain/building/adapter.ts`, allowing content expansion without modifying central engine code.
   - Catalog entries are not considered implemented until assets, bounding boxes, collision boundaries, and behavior are verified. No stock art or random placeholders.

3. **Reversible Customization**:
   - All wall/floor swatches, furniture placements, and cat accessories support instant preview and buy/undo transactions without destructive overwrites.

