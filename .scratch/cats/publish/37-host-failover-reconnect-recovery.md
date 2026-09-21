# 37 — Shared-room host failover, offline zero-advance, and two-device reconnection recovery

**What to build:** 10-second host lease failover (10–12s max failover wait); command log compaction (15m) separated from durable command receipts; snapshot reload on compacted Last-Event-ID; strict zero offline advance when unattended.

**Blocked by:** 29 — Survive migrations, corruption and interrupted saves; 34 — Real-time SSE transport, command sequencing, and authoritative host lease; 35 — Multi-actor world presence, selection reticles, and shared pause semantics

**Status:** ready-for-agent

**Requirements:** R04, R09, R10, R26

## Acceptance criteria

- [ ] When the current host client cleanly navigates away or pauses, POST /coop/lease/release marks lease expired, enabling peer to claim host role via POST /coop/lease/claim in < 1 second.
- [ ] When the current host client abruptly drops (crash, power loss, network drop), its 10-second sim_lease expires; the peer watchdog detects expiration after 10 seconds and acquires host authority via atomic CAS POST /coop/lease/claim within 10–12 seconds, showing a calming reconnecting status pill and resuming simulation without data loss.
- [ ] When all connected members are away or disconnected (visibilitychange: hidden or closed tabs), simulation advances exactly 0 sim minutes; recovery upon return loads the exact last committed state revision with zero offline progression or wall-clock catch-up (R09).
- [ ] A reconnecting or late-joining client fetches the latest committed snapshot from /api/households/[id], queries uncommitted commands from /api/households/[id]/coop/stream using Last-Event-ID, and catches up deterministically to the active host within 1.5 seconds; if Last-Event-ID was compacted (> 15m), server emits event: snapshot_reload with the full current snapshot and cursor sequence.
- [ ] Command log compaction prunes ephemeral coop_commands older than 15 minutes after snapshot commit, while separate durable command_receipts preserve monotonic actor sequences (actor_seq); old or unreplayable IDs return explicit 409 Conflict (EXPIRED_COMMAND_SEQUENCE) and are never silently treated as new.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
