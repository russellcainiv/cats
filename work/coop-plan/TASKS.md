# Private Family Co-Op: Concrete Task Breakdown (Tasks 33–38)

This document specifies the additive co-op tasks (Tasks 33–38) building upon the intact baseline of Tasks 01–32.
All tasks contain at least 4 concrete acceptance criteria, explicit failure cases, deterministic test suites, mobile/desktop parity verification, and independent blind review requirements. No acceptance criterion from Tasks 01–32 is weakened.

---

## Task 33: Private Family Membership, Invite Links, and Multi-Actor Access Control

- **Task ID**: 33
- **Slug**: `family-membership-invites`
- **Depends On**: `[1, 3]` (Task 01: Private Household & Auth; Task 03: Multi-Device Sync & Pause)
- **Requirements Covered**: `["R01", "R11", "R26"]`
- **Module**: `access`
- **Deliverable**: Primary household owner can generate secure one-time invite links; family member (daughter) redeems the link without child age/DOB tracking; server authorizes both users for the same household while preserving single-owner creation concurrency and strict stranger isolation.
- **UI Button / Action**: "Copy family invite link"
- **Test ID**: `family-member-list`
- **Expected Text**: `Daughter (Family Member)`

### Acceptance Criteria:
1. Primary owner can generate a cryptographic invite link (`POST /api/households/[id]/invites`) with SHA-256 token hashing at rest (`token_hash`), 72-hour expiration, and single-use limit (`max_uses = 1`); link is shown in UI for local copying and never transmitted to external services without explicit user command.
2. An invited family member can redeem the link via `POST /api/invites/redeem` without disclosing date of birth, age, or external personal data; server sets an authenticated session cookie (`cats_session`) and associates the account with `household_members` under `family_member` role; rejoin uses session cookie without re-pasting token.
3. Database migration preserves the existing unique constraint on `households.owner_id` (`idx_households_owner_unique`), maintaining Task 01 owner-create concurrency safety, while creating `household_members` to manage multi-member authorization and roles (`owner` and `family_member`).
4. All household and save routes (`/api/households/[id]/*`) verify requester membership in `household_members`; unauthenticated users receive 401, non-members receive 403, cross-household access is blocked, and owner-only operations (revocation, deletion) enforce `role === 'owner'`.

### Verification & Testing:
- **Domain Tests**: `tests/domain/family-access.test.ts` — Member roles, permission boundaries, invite token hashing and expiration validation.
- **Integration Tests**: `tests/integration/family-membership.test.ts` — Real PostgreSQL transactions, invite generation, redemption, duplicate redemption rejection, owner revocation of family member, and allowlist enforcement.
- **E2E Browser Tests**: `tests/e2e/family-membership-invites.spec.ts` — Mom generates invite link in GameShell settings; Daughter opens link in secondary browser context, sets display name, and enters the shared cottage.

---

## Task 34: Real-Time SSE Transport, Command Sequencing, and Authoritative Host Lease

- **Task ID**: 34
- **Slug**: `coop-sse-transport-sequencing`
- **Depends On**: `[3, 33]` (Task 03: Multi-Device Sync & Pause; Task 33: Family Membership)
- **Requirements Covered**: `["R04", "R10", "R26"]`
- **Module**: `transport`
- **Deliverable**: Low-latency Server-Sent Events (SSE) stream and HTTP command relay inside Next.js App Router on Vercel; assigns monotonic sequence numbers to player commands in PostgreSQL and manages the dynamic simulation host lease.
- **UI Button / Action**: "Connect co-op stream"
- **Test ID**: `coop-sync-status`
- **Expected Text**: `Connected (Host: Mom)`

### Acceptance Criteria:
1. `GET /api/households/[id]/coop/stream` establishes an authenticated `text/event-stream` returning initial state snapshot, active member presence, and live event broadcasts with periodic keep-alive pings; stream duration is bounded (~55s) to stay within Vercel execution bounds.
2. `POST /api/households/[id]/coop/command` accepts player commands from either authorized member, assigns a monotonic `cmd_seq` in PostgreSQL, appends to `coop_commands`, and makes updates durable; SSE route handlers across ephemeral serverless instances poll `coop_commands` (WHERE `cmd_seq > $lastSeen` every 250–500ms via `ReadableStream` with connection pool limits and request-abort cleanup) rather than relying on in-memory broadcast.
3. Server enforces a dynamic simulation lease (`sim_leases` table) with a 10-second TTL; the designated host client periodically renews the lease via heartbeat (`POST /api/households/[id]/coop/heartbeat`) every 3 seconds.
4. Reconnection with standard browser `EventSource` supports `Last-Event-ID` / sequence resumption, replaying missed commands from PostgreSQL `coop_commands` since last received sequence without dropping or duplicating events.

### Verification & Testing:
- **Integration Tests**: `tests/integration/coop-transport.test.ts` — SSE route connection, event formatting, command sequence monotonicity, concurrent command insertion, and lease heartbeat renewal.
- **E2E Browser Tests**: `tests/e2e/coop-sse-transport-sequencing.spec.ts` — Two simulated browser sessions receive commands in identical sequence within 150ms of submission.

---

## Task 35: Multi-Actor World Presence, Selection Reticles, and Shared Pause Semantics

- **Task ID**: 35
- **Slug**: `multiactor-presence-shared-pause`
- **Depends On**: `[2, 34]` (Task 02: Playable Home & Pixi; Task 34: SSE Transport)
- **Requirements Covered**: `["R01", "R04", "R09", "R26"]`
- **Module**: `world`
- **Deliverable**: Pixi canvas and DOM HUD render distinct presence indicators and selection reticles for each player; either player can pause instantly, with zero wall-time progression occurring while paused.
- **UI Button / Action**: "Pause simulation"
- **Test ID**: `coop-pause-banner`
- **Expected Text**: `Paused by Daughter`

### Acceptance Criteria:
1. PixiJS viewport renders distinctive pastel selection reticles (Mom: Coral ring `#FF7A59`; Daughter: Lavender ring `#A78BFA`) over the respective cat each player has selected; selection is visual-only and non-exclusive.
2. HUD presence bar displays connected family members with active/away indicators and selected cat portraits; clicking partner's portrait smoothly pans camera to their target cat.
3. Either player can press the Pause button at any time; `coop_pause` command broadcasts instantly, setting `isPaused = true`, stopping fixed-step sim advance on all clients, and displaying a prominent banner stating who paused (*"Paused by Daughter"* or *"Paused by Mom"*).
4. While paused, all cat needs decay, career departure timers, and aging advance strictly cease; unpausing broadcasts `coop_resume` and resumes synchronized fixed-step simulation.

### Verification & Testing:
- **Domain Tests**: `tests/domain/coop-presence-pause.test.ts` — Multi-actor selection state, pause event generation, zero simMinute delta while paused.
- **Visual & Pixi Tests**: `tests/e2e/multiactor-presence-shared-pause.spec.ts` — Dual browser contexts verify Coral and Lavender reticles on respective target cats; verify pause banner appearance on both screens when clicked on either.

---

## Task 36: Concurrent Economy, Building, and Moo-Moo Conflict Resolution

- **Task ID**: 36
- **Slug**: `concurrent-actions-conflict-resolution`
- **Depends On**: `[7, 8, 10, 19, 35]` (Task 07: Furniture; Task 08: Floor Plan; Task 10: Free-Build; Task 19: Moo-Moo; Task 35: Presence)
- **Requirements Covered**: `["R06", "R12", "R13", "R16", "R17", "R18", "R19", "R20", "R21", "R26"]`
- **Module**: `simulation`
- **Deliverable**: Authoritative conflict resolution for simultaneous cat care, furniture placement, wallet deductions, and Moo-Moo romance, strictly preserving the 8-cat capacity and economy balance under race conditions.
- **UI Button / Action**: "Place cat tree"
- **Test ID**: `conflict-feedback-toast`
- **Expected Text**: `Mochi is busy with Mom`

### Acceptance Criteria:
1. When both players issue conflicting commands to the same cat simultaneously, the earlier sequenced command claims the cat; the secondary command fails gracefully with clear toast feedback ("Mochi is currently busy with Mom") without desynchronizing simulation state.
2. Simultaneous furniture placement or building edits on the same grid cell resolve cleanly: the first placed item occupies the cell, and the second is rejected with cell-occupied feedback and zero wallet deduction.
3. Concurrent wallet expenditures check current balance atomically in database transaction; if combined purchases exceed funds, the second transaction is rejected with `INSUFFICIENT_FUNDS` without creating negative balances or duplicate items.
4. Concurrent Moo-Moo actions strictly enforce the two-tier capacity limit ($\le 4$ living/reserved cats per player, $\le 8$ total in household); when capacity is reached or clamped, litter size clamps to remaining capacity, reserving slots deterministically without silent reassignment, eviction, or deletion. When 0 slots remain, conception roll is bypassed (0 PRNG consumed) and Moo-Moo completes as affection only (R21).
5. All commands execute canonical server-side dispatch inside a PostgreSQL transaction holding row locks (`SELECT ... FOR UPDATE`), atomically committing world, revision, event, and receipt before SSE visibility; ticks advance time server-side without client-authored replacement state; caretaker slot profiles (Profile Alpha / Profile Beta) enforce living+reserved 4-cat limits with explicit `REASSIGN_CAT_CUSTODY` verifying capacity.
6. All 18 goals evaluate shared canonical real completion events from the shared simulation stream, updating progress and unlocks for both players simultaneously.

### Verification & Testing:
- **Domain Tests**: `tests/domain/concurrency-resolution.test.ts` — Atomic command dispatch ordering, wallet race condition tests, cell collision tests, dual-conception capacity clamp tests, and custody reassignment tests.
- **E2E Browser Tests**: `tests/e2e/concurrent-actions-conflict-resolution.spec.ts` — Co-op browser test firing simultaneous clicks on the same cat and same furniture slot; asserts clean resolution and UI toast.

---

## Task 37: Shared-Room Host Failover, Offline Zero-Advance, and Two-Device Reconnection Recovery

- **Task ID**: 37
- **Slug**: `host-failover-reconnect-recovery`
- **Depends On**: `[29, 34, 35]` (Task 29: Save Recovery & CAS; Task 34: SSE Transport; Task 35: Presence)
- **Requirements Covered**: `["R04", "R09", "R10", "R26"]`
- **Module**: `persistence`
- **Deliverable**: Seamless host authority failover when one device drops, deterministic catch-up for reconnecting devices, and strict zero-advance guarantees when all family members are disconnected.
- **UI Button / Action**: "Simulate host disconnect"
- **Test ID**: `host-failover-indicator`
- **Expected Text**: `Host authority transferred to Daughter`

### Acceptance Criteria:
1. When the current host client cleanly navigates away or pauses, `POST /coop/lease/release` marks lease expired, enabling peer to claim host role via `POST /coop/lease/claim` in < 1 second.
2. When the current host client abruptly drops (crash, power loss, network drop), its 10-second `sim_lease` expires; the peer watchdog detects expiration after 10 seconds and acquires host authority via atomic CAS `POST /coop/lease/claim` within 10–12 seconds, showing a calming reconnecting status pill and resuming simulation without data loss.
3. When all connected members are away or disconnected (`visibilitychange: hidden` or closed tabs), simulation advances exactly 0 sim minutes; recovery upon return loads the exact last committed state revision with zero offline progression or wall-clock catch-up (R09).
4. A reconnecting or late-joining client fetches the latest committed snapshot from `/api/households/[id]`, queries uncommitted commands from `/api/households/[id]/coop/stream` using `Last-Event-ID`, and catches up deterministically to the active host within 1.5 seconds; if `Last-Event-ID` was compacted (> 15m), server emits `event: snapshot_reload` with the full current snapshot and cursor sequence.
5. Command log compaction prunes ephemeral `coop_commands` older than 15 minutes after snapshot commit, while separate durable `command_receipts` preserve monotonic actor sequences (`actor_seq`); old or unreplayable IDs return explicit `409 Conflict` (`EXPIRED_COMMAND_SEQUENCE`) and are never silently treated as new.

### Verification & Testing:
- **Integration Tests**: `tests/integration/host-failover.test.ts` — Expired lease claim, CAS rejection on active lease, zero advance on zero presence.
- **E2E Browser Tests**: `tests/e2e/host-failover-reconnect-recovery.spec.ts` — Two browsers active; context 1 (host) is forcefully closed; context 2 detects failover within 10–12 seconds, assumes host role, and continues gameplay seamlessly.

---

## Task 38: End-to-End Mother-Daughter Co-Op Verification on Physical Desktop and Phone

- **Task ID**: 38
- **Slug**: `e2e-coop-verification-gauntlet`
- **Depends On**: `[28, 31, 35, 36, 37]` (All co-op tasks + Task 28: Mobile Accessibility + Task 31: Whole-Game Verification)
- **Requirements Covered**: `["R01", "R04", "R05", "R08", "R09", "R10", "R14", "R20", "R21", "R26"]`
- **Module**: `verification`
- **Deliverable**: Comprehensive end-to-end multi-device dogfooding and verification across physical laptop/desktop and mobile/tablet form factors, proving full co-op feature completeness and zero regression of core game rules.
- **UI Button / Action**: "Run co-op gauntlet"
- **Test ID**: `coop-verification-summary`
- **Expected Text**: `Co-op Verification Passed (All Gates Green)`

### Acceptance Criteria:
1. Both devices (Desktop mouse/keyboard and Phone/Tablet touch) simultaneously control different cats, interact with furniture, feed, play, and build without UI overlap, clipping, or input blocking.
2. Career clothing renders accurately on both viewports when a cat leaves for work and restores upon return; 8-cat limit holds firm under all family actions.
3. Physical network disconnects (airplane mode toggle on phone, Wi-Fi reconnection) recover within 5 seconds without desync or duplicate cats.
4. Independent blind review and physical dogfooding capture passes all 5 Co-Op Gauntlet Gates with zero defects.
5. Preserves all original Task 01–32 baseline requirements and criteria intact with zero regression.

### Verification & Testing:
- **Playwright Dual-Context E2E**: `tests/e2e/e2e-coop-verification-gauntlet.spec.ts` — Desktop viewport (1280x800) and Mobile touch viewport (390x844) executing simultaneous scripted interactive sessions.
- **Visual Regression**: Deterministic screenshot captures of dual reticles, co-op HUD, shared pause banner, and concurrent building.
