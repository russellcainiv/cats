# 22 — Treat illness and respond to danger

**What to build:** Illness, severe neglect and a kitchen-fire accident can be treated or lead to permanent death.

**Blocked by:** 21 — Age at a fixed pace and face old age; 05 — Feed, rest, play and care for cats

**Status:** ready-for-agent

**Requirements:** R08

## Acceptance criteria

- [ ] Symptoms and warnings precede consequences; offer meaningful treatment/rescue rather than unavoidable per-frame death rolls.
- [ ] Interventions change outcomes through actual cost, action duration, world state and save behavior.
- [ ] Closed/hidden games never advance hazard timers; recovery cancels the matching pending event.
- [ ] Concurrent causes create one death record and do not duplicate memorials or clear unrelated state.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
