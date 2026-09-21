# Cats architecture contract

This document is a proposed implementation contract for the greenfield game. It contains no claim that these modules or services already exist. Confirmed product requirements remain authoritative in [.scratch/cats/spec.md](../.scratch/cats/spec.md); proposed details below are engineering defaults.

## Boundaries

The browser has four boundaries: React shell and accessible HUD; PixiJS 8 world view; a headless simulation package; and server persistence/auth routes. Commands cross into the simulation boundary, and projections cross back out. Rendering code cannot change domain state. The server is the authority for ownership, revision, lease, and cloud writes; the client is the authority for local input and temporary recovery only.

Proposed stack: TypeScript, Next.js App Router, PixiJS 8, React DOM, IndexedDB, Clerk, Neon Postgres, and Vercel Marketplace wiring. A future executor must verify current APIs against the official documentation before implementation. No runtime AI or API key is necessary.

## Domain model

```text
Household { id, ownerId, revision, seed, simClock, mode, livingCatIds[], reservedLitterSlots, world, economy, unlocks, memorialIds[] }
Cat { id, householdId, name, appearance, traits, lifeStage, ageMinutes, needs, mood, skills, relationships, autonomy, lifeStatus, pregnancyId?, createdAt }
Pregnancy { id, parentIds[2], startedAt, dueAt, reservedSlots, conceptionEventId }
Memorial { id, deceasedCatSnapshot, cause, time, visits[] }
World { homes, build, venues, NPCs, activeEvents[] }
Event { id, type, sequence, simTime, actorIds[], payload, rngLabel }
Command { id, householdId, actor, type, payload, clientRevision, clientTime }
Snapshot { schemaVersion, household, checksum, updatedAt }
```

`lifeStatus` is living or deceased; `lifeStage` is kitten, adolescent, adult, or elder; pregnancy is a separate reference. Ghosts are projections of memorial records, never Cat records. Free-build provenance belongs on items and build edits, so careers and normal household money still function; only free-build-created value cannot mint or resell progression. A snapshot must be bounded: proposed limits are 8 living cats, 8 reserved litter slots, 128 active events, 64 NPCs, 2 MiB compressed payload, and 10 MiB local recovery history.

## Simulation contract

```ts
dispatch(state: WorldState, command: GameCommand, context: CommandContext): CommandResult
advance(state: WorldState, elapsedSimMinutes: number): WorldState
selectView(state: WorldState): GameView
```

The proposed persisted envelope is:

```ts
SaveEnvelope {
  schemaVersion: number; catalogVersion: number; revision: number;
  leaseEpoch: number; simMinute: number; rngState: string;
  world: WorldState; checksum: string;
}
```

Commands are JSON-typed and carry an idempotent `commandId`. `WorldState`, `GameCommand`, `CommandContext`, `CommandResult`, and `GameView` are proposed owned interfaces for the future executor.

The input seed and prior RNG state produce identical events. Open time is clamped to a proposed 250ms maximum per foreground frame; hidden-tab, close, network-loss, or lease-conflict time is discarded rather than accumulated. Resume requires lease and save reconciliation. Commands are validated before random draws. Moo-Moo readiness checks adult status, mutual love, alignment, willingness, and mood; a declined proposal emits a decline event without consuming RNG. Compute `available = 8 - livingCount - sum(reservedLitterSlots)`; when available is zero, complete the romantic action without a conception draw. Otherwise an eligible completed action makes exactly one 25% conception draw; on success draw litter size 1–3 once, clamp it to `available`, and reserve that exact count immediately. Retries never redraw. Birth exchanges those reserved slots for kittens atomically. Death emits warning/intervention events before a preventable terminal event; memorial and ghost projection follow death without restoring life.

## Persistence API contract

These routes are proposed interfaces, not existing routes.

```text
POST /api/households                 -> 201 HouseholdEnvelope (request idempotency required)
GET  /api/households                 -> 200 HouseholdIndex
GET  /api/households/[id]            -> 200 SaveEnvelope | 404 NotFound
GET  /api/households/[id]/view       -> 200 { revision, checksum, view: GameView } | 404 NotFound
POST /api/households/[id]/lease      -> 200 LeaseToken (acquire/renew/release/takeover mode) | 409 LeaseConflict
POST /api/households/[id]/save       -> 200 SaveReceipt | 409 RevisionConflict | 413 PayloadTooLarge | 422 CorruptSnapshot
POST /api/households/[id]/recover    -> 200 RecoveryReceipt | 409 RevisionConflict | 422 SchemaUnsupported
GET  /api/health                    -> 200 ServiceHealth
```

Every route authenticates server-side and checks the authenticated owner against the household owner. No route accepts an owner ID as authority. Creation requires a request idempotency key. Lease modes are explicit: acquire, renew, release, and takeover. Takeover is allowed only after expiry, increments `leaseEpoch`, and immediately invalidates the old device. All lease conflicts use 409. Commands carry an idempotency ID; duplicate IDs return the stored result. Writes include `expectedRevision`; mismatch returns 409 with the current revision and a merge/reload instruction. The lease has a proposed 30-second TTL, renewal before half-life, and monotonically increasing fencing token.

IndexedDB stores the latest confirmed snapshot and a bounded recovery branch. A network interruption pauses simulation and waits for a checkpoint; it never advances simulation or action queues while closed, hidden, or offline. On reconnect, the client resumes only after lease and revision checks. If CAS fails, it preserves the local branch, reloads the cloud revision, and offers explicit recover/discard actions. Corrupt or unknown-schema data is quarantined, reported, and replaced only through a validated recovery path. Schema upgrades are numbered migrations with forward validation and a backup before transformation.

## Error and security contract

Use stable machine statuses and plain-language UI messages: 401 unauthenticated, 403 wrong owner/private allowlist, 404 household absent, 409 stale revision/lease conflict, 413 size limit, 422 invalid command or snapshot, 423 active writer, 429 rate limit, and 500/503 retryable service failure. Error bodies contain request ID and safe recovery action, never secrets or arbitrary stack traces.

Security fixtures use synthetic owners, households, tokens, and snapshots. Tests must prove cross-owner reads/writes fail, replayed commands are harmless, fencing prevents stale writes, free-build cannot mint economy value, payload bounds hold, and private allowlist rejects unknown accounts. Never use production credentials or real gift data in tests.

## UI and device contract

The same command and projection contracts drive phone and computer. Touch targets, pointer controls, keyboard navigation, accessible labels, readable warnings, and a responsive HUD are required. Phone supports every core action: direction, care, building, Moo-Moo, relationships, goals, economy, neighborhood travel, and save recovery. Pixi canvas is resized responsively; DOM overlays remain semantic and testable. The art reference guides palette, warmth, cutaway composition, expressive cats, and pixel neighborhood texture; it is not a static gameplay substitute.

## Content contract

The proposed first content inventory is three scheduled careers (Café Assistant, Garden Keeper, Gallery Helper), two hobbies (Painting, Gardening), three crops (tomato, strawberry, catnip), one ownable café with three recipes, eight named NPC cats, seven lots (player home, three NPC homes, park, shop, café), 30 functional furnishing/decor IDs, and 18 named goals. All content has stable IDs, localization-ready names, costs, unlock conditions, interaction verbs, and test fixtures. This inventory is a proposed complete first-pass default, not a founder-approved count.

## Release and observability contract

Build and release only after domain, persistence, browser seam, accessibility, responsive, security-fixture, and migration rehearsal gates pass. Log request ID, owner-safe household ID hash, revision, command ID, event sequence, latency, and error status; never log names, secrets, full snapshots, or tokens. A release smoke test uses a private allowlisted synthetic account and verifies load, command, autosave, reconnect, and phone viewport. Production acceptance must distinguish local, preview, and private live evidence.

## Co-op architecture contract (Requirement R26)

This section specifies the bounded extension enabling mother and daughter to play collaboratively in real time, fulfilling Requirement R26 (Tasks 33–38).

### Co-op Route Contracts
```text
POST /api/households/[id]/invites               -> 201 InviteEnvelope (cryptographic secret token hashed with SHA-256 at rest)
POST /api/invites/redeem                        -> 200 MemberSession (child-safe, zero PII, sets cats_session)
POST /api/households/[id]/members/[memberId]/revoke -> 200 RevokeReceipt
GET  /api/households/[id]/coop/stream           -> 200 text/event-stream (SSE downstream broadcast, Last-Event-ID replay)
POST /api/households/[id]/coop/command          -> 200 CommandReceipt (monotonic cmd_seq in PostgreSQL)
POST /api/households/[id]/coop/tick             -> 200 TickReceipt (bounded tick advance by timing leader)
POST /api/households/[id]/coop/heartbeat        -> 200 HeartbeatReceipt (10s lease renewal every 3s)
POST /api/households/[id]/coop/lease/claim      -> 200 LeaseClaimReceipt | 409 LeaseConflict
POST /api/households/[id]/coop/lease/release    -> 200 LeaseReleaseReceipt (instant handoff < 1s)
POST /api/households/[id]/coop/pause            -> 200 PauseReceipt (instant cooperative pause)
POST /api/households/[id]/coop/resume           -> 200 ResumeReceipt
```

### Co-op Authority, Transport & Failover Model
1. **Stateless Serverless Concurrency**: Next.js App Router route handlers on Vercel are stateless and ephemeral. Multiple client sessions may connect to separate runtime instances. Shared state cannot reside in node process memory. Therefore, all sequenced player commands and ticks are committed to a PostgreSQL-backed log (`coop_commands`) with monotonic sequence numbers (`cmd_seq BIGSERIAL`).
2. **Server-Sent Events (SSE) Downstream**: `GET /api/households/[id]/coop/stream` provides lightweight, unidirectional real-time broadcast of commands, ticks, presence, and pause events via `text/event-stream`. Streams are bounded to ~55s to fit within serverless duration limits. Reconnections automatically pass `Last-Event-ID`, allowing PostgreSQL cursor replay (`WHERE cmd_seq > last_seen`) with zero dropped events.
3. **Dynamic Simulation Host Lease (Timing Leader)**: One active connected client holds the simulation lease in `sim_leases` (10-second TTL), renewed every 3 seconds via heartbeat (`POST /coop/heartbeat`). The timing leader submits bounded tick requests (`POST /coop/tick`, max 1 sim minute per second). The server validates the host lease epoch, runs the canonical pure reducer `advance(state, dt)` in PostgreSQL, updates the canonical revision, and broadcasts state ticks.
4. **Authority Failover Timing**:
   - **Graceful Handoff**: If the host navigates away or pauses cleanly, `POST /coop/lease/release` marks the lease expired immediately; the peer claims the lease via `POST /coop/lease/claim` in **< 1 second**.
   - **Abrupt Disconnect**: If the host drops abruptly (crash, power loss, network drop), the 10-second lease expires after 10 seconds. The peer watchdog detects expiration and acquires host authority via atomic CAS `POST /coop/lease/claim` within a realistic **10 to 12 second failover window**, showing a calming reconnecting status pill and continuing simulation from the last committed server revision without data loss.
5. **Strict Zero Offline Progression (R09)**: When both devices are disconnected or have backgrounded tabs, no client holds an active lease and no ticks are submitted. The server executes 0 ticks, advancing exactly 0 sim minutes. Upon reconnecting hours or days later, the household restores from the last committed PostgreSQL snapshot with zero wall-clock catch-up.
6. **Multi-Actor Access & Invariant Preservation**:
   - The unique constraint on `households.owner_id` (`idx_households_owner_unique`) is **strictly preserved**, maintaining Task 01 owner-create concurrency safety.
   - Multi-actor membership is managed via `household_members` with roles `owner` (Mom) and `family_member` (Daughter). Both have full gameplay parity.
   - Distinct pastel selection reticles (Coral `#FF7A59` for Mom; Lavender `#A78BFA` for Daughter) on Pixi canvas; cat selection is visual-only and non-exclusive.
   - Concurrency conflicts resolve authoritatively: atomic CAS on furniture grid cells, atomic server wallet balances, and strict clamping of the 8-cat limit (`livingCount + sum(reservedLitterSlots) <= 8`) under concurrent Moo-Moo.
   - All 18 goals evaluate shared canonical domain events from the shared simulation stream.
   - Secret capabilities: invite tokens have 256-bit entropy, are hashed at rest (`token_hash = sha256(token)`), single-use (`max_uses = 1`), 72-hour TTL. Zero child PII collected. No external invitation messages sent. Rejoin uses authenticated session cookies without re-pasting tokens.
   - Confirmed family model: shared household on separate simultaneous devices, four cats per player (eight total living/reserved). Working defaults: shared cat care; 45% Dam / 45% Sire / 10% Novel domestic mutation genetics odds (`FAMILY-GENETICS-DECISIONS-02.md`).
7. **Ephemeral Container Loop & Durable Server-Side Reducer**:
   - Vercel functions run in ephemeral containers with zero shared memory. SSE route handlers on Container A execute an asynchronous query loop over PostgreSQL (`SELECT * FROM coop_commands WHERE household_id = $id AND cmd_seq > $lastSeen ORDER BY cmd_seq ASC LIMIT 50`) every 250ms–500ms with connection pool bounds and `req.signal.onabort` cleanup. Zero reliance on in-memory broadcast.
   - `POST /coop/command` executes canonical `dispatch(currentWorldState, command, actorContext)` server-side within a PostgreSQL transaction holding row locks (`SELECT ... FOR UPDATE`), atomically committing state, revision, event, and durable receipt before SSE visibility.
   - Caretaker slot profiles (Profile Alpha / Profile Beta) enforce living+reserved 4-cat limits. Revoking a member removes access without deleting cats or shifting them into the owner's slots; cats remain in Profile Beta under owner SharedCare. Explicit `POST /api/households/[id]/cats/[id]/reassign` verifies capacity and moves gestating litters atomically.
   - Compaction prunes ephemeral `coop_commands` older than 15 minutes after snapshot commit, while separate durable `command_receipts` preserve monotonic actor sequences (`actor_seq`), rejecting old/expired commands with `409 Conflict` (`EXPIRED_COMMAND_SEQUENCE`) and emitting `event: snapshot_reload` when `Last-Event-ID` was compacted.
   - Consolidated 21-Route Actor Permission Matrix codified in `docs/contracts.md`.

## Genetics architecture contract (Requirement R27, Task 39)

### Domain Schemas & Invariant Models
```text
ParentGeneticsSnapshot { catId, name, baseAppearance, traits[2], generation, ownerMemberId }
PregnancyRecord { pregnancyId, householdId, damId, sireId, conceivedAtSimMinute, dueAtSimMinute, litterSize, reservedSlotAllocations[], parentSnapshots: { dam, sire }, resolved }
FeatureProvenance { feature, source, sourceParentId?, sourceValue, rolledValue, sourceProbability, effectiveOutcomeProbability, rngRoll }
TraitProvenance { slot, source, sourceParentId?, trait, conditionalProbability, rngRollSource, rngRollIndex }
KittenGeneticsProvenance { version, policy, conceivedAtSimMinute, bornAtSimMinute, damId, sireId, features, traits[2] }
```

### Inheritance Mechanics & Rarity Guard
1. **Configurable Odds Policies**: Parameterized `DEFAULT_INHERITANCE_ODDS` supports working default Policy Alpha (45% Dam, 45% Sire, 10% Novel Domestic Catalog) and Policy Beta (50% Dam, 50% Sire). When Dam and Sire share identical values, observable probability sums to 90% (or 100% in Beta).
2. **Novel Mutation Rarity Guard**: A novel 10% mutation roll draws exclusively from the common domestic catalog (`domestic_shorthair`, standard patterns, approved palette colors). It **never** hands out undiscovered wild or fantasy breeds unless eligible rare parentage exists.
3. **Approved Art Palette Grounding**: Fur color genetics draw strictly from the approved palette: Black (`#1A1A1A`), White (`#FFFFFF`), Brown/Chocolate (`#8B5A2B`), Tan/Fawn (`#D2B48C`), Ginger (`#E67E22`), Grey/Silver (`#808080`), and Cream (`#F5E6D3`). No unapproved colors may be generated.
4. **Non-Colliding Trait Allocation & Zero-Division Guard**:
   - Canonical invariant: every cat has exactly two distinct personality traits (`traits: [PersonalityTrait, PersonalityTrait]` where `traits[0] !== traits[1]`) from the 10-trait catalog.
   - Pre-conception feasibility check guarantees $|P_A \cup P_B| \ge 2$ before conception; invalid legacy parents with $\le 1$ trait are rejected before pregnancy with an actionable error and repair dialog.
   - If parental candidate pools are exhausted after Trait 1 ($|P_A \cup P_B \setminus \{T_1\}| == 0$), Policy Alpha draws Trait 2 100% from the novel catalog with provenance `{ source: 'novel_catalog_fallback', odds: 1.0 }`, preventing any `0/0` division by zero.
5. **Deterministic PRNG Allocation Order**: Exact sequential draws per kitten: breed, primary color, pattern, secondary color, eye color, body type, trait 1 source/index, trait 2 source/index. Zero rerolls; guaranteed byte-for-byte reproducibility across client and server.
6. **Conception Snapshot & Carrier Termination**: Parent snapshots are captured at conception. If carrier passes away, gestation aborts immediately and reserved slots are released.
7. **Per-Player Capacity Reservation**: Hard capacity limit of $\le 4$ living/reserved cats per player and $\le 8$ total in household. Reserved kitten slots allocate at conception via Dam-primary with partner-overflow logic (`assignedMemberId: 'mom' | 'daughter'`) and convert atomically to living cats at birth without silent reassignment, eviction, or deletion.
8. **Save Migration**: Existing starter cats migrate deterministically with `geneticsProvenance: null`, `generation: 1`, and legacy 3-field appearances normalize with 0 RNG consumption.

## Reusable GPT Image artwork architecture (Requirement R28, Task 40)

1. **Asset Pipeline & Modularity**: All visual in-game assets derive from modular, reusable GPT Image originals matching the approved pastel cartoon and pixel neighborhood direction (`docs/art/approved-direction.png`).
2. **Code Ownership of Geometry & Text**: Asset textures and sprite sheets feed PixiJS sprite containers and DOM overlays. Grid cell dimensions, pathfinding navmeshes, building collision bounds, and typography rendering remain strictly in code.
3. **Layered Sprite Assembly**: Cat world sprites assemble from modular layers: base anatomy mesh, coat texture/color tints, pattern mask, eye layer, career uniforms, and collar accessories.
4. **Performance & Viewport Parity**: Asset loader enforces mipmapped textures, texture atlas batching, zero layout shift, and 60fps rendering across desktop (1280x800) and mobile touch (390x844).

## Rare cat dex & exploration discovery architecture (Requirement R29, Task 41)

1. **Catalog Scope & Grounding**: Real cat appearance standards are grounded in official TICA and CFA breed registers. Catalog partitions into Domestic Breeds, Mixed Coats, Rare Wild Cats (8 species including Caracal, Serval, Lynx, Sand Cat, Pallas's Cat), and Mythical Fantasy Cats (8 forms including Moonlit Celestial, Cloud-Weaver, Starlight Shadow).
2. **Category Rarity Weights (Working Tuning Default)**:
   - Common Domestic: 70.0% (`0.7000`)
   - Uncommon Domestic: 24.0% (`0.2400`)
   - Rare Domestic: 5.0% (`0.0500`)
   - Rare Wild: 0.75% (`0.0075`) — ~0.09375% per species
   - Mythical Fantasy: 0.25% (`0.0025`) — ~0.03125% per form
   - Wild and fantasy are strictly the rarest encounter tiers, combined representing 1.0% of encounters.
3. **Active Simulation Time Pacing**:
   - Pacing uses Active Simulation Time: 1 real second = 1 sim minute (1,440 sim minutes per day).
   - Encounters schedule deterministically from `(household.seed, simDay, lotId)` and remain active for 60 sim minutes (60 seconds of active play).
   - Paused and offline time delta is 0.00; encounters never advance or reroll during closed or offline time.
   - Encounters persist in `world.neighborhood.activeEncounters`; reloading, leaving/re-entering, or viewing on second device returns the exact same encounter.
4. **Strict Acquisition Gating**: Starter Cat Creator permits only domestic and mixed recreation (preserving real-cat creation). Rare wild and fantasy cats **cannot** be created or purchased; they exist exclusively as rare exploration discoveries.
5. **Full-Household Friendship & Recruitment**: At household capacity (4 per player / 8 total), rare cats can still be befriended and remain persistent neighborhood friends who visit the home, café, and park. When a player has an open slot, befriended cats can be formally invited without forced eviction of existing cats. Zero paid draws or randomized microtransactions.

## Feline activity & natural behavior architecture (Requirement R30, Task 42)

1. **Paw-Based Activity Adaptation**: Career and hobby tasks are adapted to natural feline anatomy: cats knead dough with front paws at the café, dig garden plots with claws, dab paint onto canvases with paw tips or mouth brushes, and carry harvest baskets in jaws. Strictly no human torsos or hands.
2. **Tailored Four-Legged Workwear**: Outfits (Café apron, Gardener overalls, Gallery smock/beret) fit natural quadrupeds without anatomical distortion, automatically equipping at work departure and restoring on return.
3. **Authentic Feline Instinct Behaviors**: State-driven autonomous behaviors interleave with daily tasks: loafing, curling up in cardboard boxes, mutual head-bunting, self-grooming, tail flick communication, spontaneous zoomies, and distraction by yarn or laser pointers.

## Durable multi-generation lineage & hybrid naming architecture (Requirement R31, Task 43)

1. **Multi-Generation Ancestry Graph**:
   - `WorldState.lineage` maintains a persistent Directed Acyclic Graph (DAG) of `LineageNode` records across all generations.
   - Each node stores immutable `lineageId`, parent IDs (`parentAId`, `parentBId`), birth breed, hybrid name, appearance snapshot, and ghost/deceased status.
   - Renaming, death, memorialization, or caretaker profile transfers never overwrite or detach ancestry records.
   - Cycle detection (`validateLineageDAG`) executes prior to conception to guarantee acyclic family integrity.
2. **Genealogical Relatedness Inbreeding Guards**:
   - Traversal algorithm (`areCatsRelated(catAId, catBId, maxGenerations = 3)`) checks shared ancestors up to great-grandparents.
   - Prevents romance and Moo-Moo between parent-child, siblings, and grandparent-grandchild with clear, gentle in-game feedback.
3. **Deterministic Order-Independent Hybrid Breed Naming**:
   - When parents of distinct breeds successfully give birth, compute recipe key: `sort([breedA, breedB]).join('x')` (e.g. `bengalxragdoll` -> `"Ragdal"`, `persianxsiamese` -> `"Persimese"`, `mainecoonxscottishfold` -> `"Coonfold"`).
   - Names generate deterministically at birth, never on unsuccessful romance.
   - Foundation breeds and generation depth (`F1`, `F2`) are preserved; deeper generations use highest-percentage or foundation ancestry labels, strictly preventing unbounded hyphenation or infinite concatenation.
   - Hybrid naming never unlocks wild or fantasy discovery gates.
4. **Interactive Family Tree UI**:
   - Dedicated UI component rendering hierarchical pan/zoom node tree across desktop (1280x800) and mobile (390x844).
   - Displays portraits, birth breeds, hybrid badges, living/ghost status, and inspector modal showing relatives. Synchronized across co-op devices.

## Expanded functional customization & furniture catalog architecture (Requirement R32, Task 44)

1. **Expanded 64+ Usable Furnishings Across 4 Room Styles**:
   - Catalog provides at least 64 unique items across Cozy Cottage, Modern Cat, Whimsical Play, and Rustic Garden styles.
   - Meaningful functional affordances: climbing shelves (Fun need satisfaction), sisal scratch lounges (Scratch need + sofa protection), automatic fountains (Hydration/Thirst), heated beds (Comfort + Energy), puzzle feeders (Fun + Hunger).
2. **Decoupled Content Module & Engine Adapter**:
   - Implemented under `src/content/furniture/` and `src/domain/building/adapter.ts`, decoupling content authoring from central building logic.
   - Items require verified assets, collision bounding boxes, pathfinding navmesh updates, and behavioral tests before claiming implementation. Zero stock art or placeholder emoji.
3. **Customization Palettes & Reversible Swatches**:
   - Cat customization expanded with 16 additional coat patterns, 8 eye color palettes, and 12 wardrobe accessories.
   - Home aesthetic swatches for wallpaper and flooring support atomic preview and buy/undo transactions without destructive state replacement.

## References

Future executor must verify APIs from [PixiJS Application](https://pixijs.com/8.x/guides/components/application), [Next.js App Router](https://nextjs.org/docs/app), [Neon](https://neon.tech/docs), [Clerk Next.js](https://clerk.com/docs/nextjs/overview), [Vercel Functions WebSockets](https://vercel.com/docs/functions/websockets), [Vercel Guide on WebSockets](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections), and [Vercel Function Duration](https://vercel.com/docs/functions/configuring-functions/duration) documentation before implementation. Primary breed references: [TICA All Breeds](https://tica.org/ticas-breeds/browse-all-breeds/) and [CFA Breeds](https://cfa.org/breeds/).
