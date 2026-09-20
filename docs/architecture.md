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

## References

Future executor must verify APIs from [PixiJS Application](https://pixijs.com/8.x/guides/components/application), [Next.js App Router](https://nextjs.org/docs/app), [Neon](https://neon.tech/docs), and [Clerk Next.js](https://clerk.com/docs/nextjs/overview) documentation before implementation.
