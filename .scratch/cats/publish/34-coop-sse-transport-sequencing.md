# 34 — Real-time SSE transport, command sequencing, and authoritative host lease

**What to build:** Next.js SSE stream route with durable Postgres poll loop (no in-memory broadcast), monotonic PostgreSQL command sequencing (coop_commands), 10s simulation host lease with 3s heartbeats.

**Blocked by:** 03 — Resume safely across devices and pause while away; 33 — Private family membership, invite links, and multi-actor access control

**Status:** ready-for-agent

**Requirements:** R04, R10, R26

## Acceptance criteria

- [ ] GET /api/households/[id]/coop/stream establishes an authenticated text/event-stream returning initial state snapshot, active member presence, and live event broadcasts with periodic keep-alive pings; stream duration is bounded (~55s) to stay within Vercel execution bounds.
- [ ] POST /api/households/[id]/coop/command accepts player commands from either authorized member, assigns a monotonic cmd_seq in PostgreSQL, appends to coop_commands, and makes updates durable; SSE route handlers across ephemeral serverless instances poll coop_commands (WHERE cmd_seq > $lastSeen every 250–500ms via ReadableStream with connection pool limits and request-abort cleanup) rather than relying on in-memory broadcast.
- [ ] Server enforces a dynamic simulation lease (sim_leases table) with a 10-second TTL; the designated host client periodically renews the lease via heartbeat (POST /api/households/[id]/coop/heartbeat) every 3 seconds.
- [ ] Reconnection with standard browser EventSource supports Last-Event-ID / sequence resumption, replaying missed commands from PostgreSQL coop_commands since last received sequence without dropping or duplicating events.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
