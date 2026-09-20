# 11 — Paint, improve and sell artwork

**What to build:** Use an easel to grow painting skill and create art that can be displayed or sold.

**Blocked by:** 05 — Feed, rest, play and care for cats; 07 — Buy, place, recolor, move, rotate and sell furniture

**Status:** ready-for-agent

**Requirements:** R03, R12, R15

## Acceptance criteria

- [ ] Work duration, skill and seeded quality produce a real persistent artwork.
- [ ] Cancel or loss of the easel preserves partial progress without duplication.
- [ ] Display creates a placeable artwork; idempotent sale removes it and credits exactly once.
- [ ] Skill, product provenance and work-in-progress survive device switch.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
