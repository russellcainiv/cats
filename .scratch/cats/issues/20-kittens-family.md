# 20 — Raise kittens and follow generations

**What to build:** Name and care for kittens, see inherited looks/traits and navigate the family tree.

**Blocked by:** 19 — Moo-Moo, chance pregnancy and safe birth; 05 — Feed, rest, play and care for cats

**Status:** ready-for-agent

**Requirements:** R19, R20

## Acceptance criteria

- [ ] Store both parent identities, inheritance and life stage even after death or move-out.
- [ ] Kitten care and animations work; kittens cannot work, romance or Moo-Moo.
- [ ] Family tree distinguishes living, deceased and moved-out members and prevents close-relative romance.
- [ ] Handle pregnancy-carrier death and interrupted birth with released reservations and no orphaned state.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
