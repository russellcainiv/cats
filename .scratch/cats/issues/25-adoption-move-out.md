# 25 — Adopt and move adult cats to neighborhood homes

**What to build:** Adopt when there is space or let an adult move out while retaining its identity and relationships.

**Blocked by:** 04 — Create real or imaginary cats; 15 — Travel to a lively persistent neighborhood; 20 — Raise kittens and follow generations; 21 — Age at a fixed pace and face old age

**Status:** ready-for-agent

**Requirements:** R07, R08, R20, R24

## Acceptance criteria

- [ ] Preview adoption and confirm before atomic funds/capacity changes, counting unborn reservations.
- [ ] Move-out is a confirmed transfer to a residence with a slot, not deletion; the cat remains visitable.
- [ ] Defer pregnant-cat transfer until birth with a clear explanation; do not cancel pregnancy silently.
- [ ] Adoption after last-cat death continues the existing home, money, memories and neighborhood.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
