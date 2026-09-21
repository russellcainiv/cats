# 36 — Concurrent economy, building, and Moo-Moo conflict resolution

**What to build:** Server-side canonical dispatch inside Postgres transaction; caretaker slot profile custody; race-condition resolvers for cat care, grid cell building collision, wallet deduction, and 8-cat capacity clamping under dual Moo-Moo. Shared canonical goal events.

**Blocked by:** 07 — Buy, place, recolor, move, rotate and sell furniture; 08 — Build the floor plan, rooms and finishes; 10 — Offer free-build without money exploits; 19 — Moo-Moo, chance pregnancy and safe birth; 35 — Multi-actor world presence, selection reticles, and shared pause semantics

**Status:** ready-for-agent

**Requirements:** R06, R12, R13, R16, R17, R18, R19, R20, R21, R26

## Acceptance criteria

- [ ] When both players issue conflicting commands to the same cat simultaneously, the earlier sequenced command claims the cat; the secondary command fails gracefully with clear toast feedback ("Mochi is currently busy with Mom") without desynchronizing simulation state.
- [ ] Simultaneous furniture placement or building edits on the same grid cell resolve cleanly: the first placed item occupies the cell, and the second is rejected with cell-occupied feedback and zero wallet deduction.
- [ ] Concurrent wallet expenditures check current balance atomically in database transaction; if combined purchases exceed funds, the second transaction is rejected with INSUFFICIENT_FUNDS without creating negative balances or duplicate items.
- [ ] Concurrent Moo-Moo actions strictly enforce the two-tier capacity limit (<= 4 living/reserved cats per player, <= 8 total in household); when capacity is reached or clamped, litter size clamps to remaining capacity, reserving slots deterministically without silent reassignment, eviction, or deletion. When 0 slots remain, conception roll is bypassed (0 PRNG consumed) and Moo-Moo completes as affection only (R21).
- [ ] All commands execute canonical server-side dispatch inside a PostgreSQL transaction holding row locks (SELECT ... FOR UPDATE), atomically committing world, revision, event, and receipt before SSE visibility; ticks advance time server-side without client-authored replacement state; caretaker slot profiles (Profile Alpha / Profile Beta) enforce living+reserved 4-cat limits with explicit REASSIGN_CAT_CUSTODY verifying capacity.
- [ ] All 18 goals evaluate shared canonical real completion events from the shared simulation stream, updating progress and unlocks for both players simultaneously.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
