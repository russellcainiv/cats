# ADR 0001: Deterministic open-session simulation and revisioned saves

## Status

Proposed engineering decision for implementation planning. No runtime implementation or provider provisioning is implied.

## Context

Cats needs autonomous life simulation, permanent loss, pregnancy, careers, building, and synced continuation on phone and computer. The confirmed contract requires the simulation to pause while closed, prevents offline progression, permits Moo-Moo at eight cats without pregnancy, and requires permanent memorials and ghosts. Multiple devices and interrupted sessions create stale-write and recovery risks. A random, client-owned simulation would be difficult to reproduce or protect from double application.

## Decision

Use a deterministic, seeded simulation executed only for active open-session time. A headless domain boundary accepts a versioned snapshot and validated command, advances by bounded open seconds, and emits ordered events plus a render projection. Randomness is a named, persisted RNG stream. Rejected commands consume no random draw. Life-stage defaults are kitten 10, adolescent 20, adult 95, elder 25 sim days at one real second per sim minute; these values are proposed playtest defaults and are fixed during a given release, with no player lifespan setting.

Persist checkpoints in IndexedDB and authoritative revisions in a proposed Neon-backed service. A proposed Clerk-backed private allowlist authenticates requests. Writes use expected revision compare-and-swap, command idempotency IDs, and a single writer lease with a short TTL and monotonically increasing fencing token. A stale writer receives a conflict/fenced response and cannot overwrite a newer revision. Local interrupted branches remain recoverable; closing or losing connectivity never advances simulation time.

Moo-Moo first validates two adult cats' mutual love, alignment, willingness, and mood. Player suggestions cannot override a decline. Eligible completion performs one proposed 25% conception roll; pregnancy lasts three sim days and yields one to three kittens capped by reserved slots. At eight living cats, no slot is available, but the romantic action remains available. Death emits warnings where intervention is possible, then a permanent deceased record, memorial, and possible non-resurrecting ghost visits. If all but one cats die, the final living cat remains recoverable through the normal household load path.

## Consequences

Determinism makes bugs, saves, browser seam tests, and player reports reproducible. Server authority protects private households and prevents duplicate rewards or births. CAS and fencing add UI states for stale revisions and lease takeover; local recovery requires explicit merge/discard handling. IndexedDB and cloud snapshots require schema migration, checksums, payload bounds, and corruption quarantine. The approach does not provide offline progression, by design. Proposed Neon and Clerk choices require current API verification before coding and can be replaced only while preserving the interfaces and guarantees in `docs/architecture.md`.

## Rejected alternatives

- Wall-clock catch-up after closing: rejected by R09 and creates unobserved death and needs decay.
- Client-only authoritative saves: rejected because cross-device ownership and stale writes cannot be trusted.
- Unseeded random calls: rejected because reproduction and fair recovery require deterministic evidence.
- Guaranteed pregnancy or a separate approval step: rejected by R17–R19 and the Moo-Moo vocabulary contract.
- Expanding the household past eight or silently evicting cats: rejected by R20–R21.
- Restoring deceased cats: rejected by R08 and R22.
