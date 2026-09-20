# 05 — Feed, rest, play and care for cats

**What to build:** Use real objects to satisfy hunger, energy, fun, social, hygiene and bladder needs.

**Blocked by:** 02 — Select and move an animated cat in the approved world; 03 — Resume safely across devices and pause while away

**Status:** ready-for-agent

**Requirements:** R01, R02, R03, R09

## Acceptance criteria

- [ ] Each action navigates, reserves an anchor, animates, takes simulation time and applies an observable need effect.
- [ ] Queue, cancel and interrupted/removed/occupied targets release reservations and unused resources.
- [ ] Bowl, bed, toy, litter and grooming objects all work end to end and persist their state.
- [ ] Paused/closed games do not decay needs; UI rendering never advances simulation time.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
