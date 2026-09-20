# 14 — Complete goals and unlock content

**What to build:** Track meaningful care, building, skill and career goals and earn rewards.

**Blocked by:** 07 — Buy, place, recolor, move, rotate and sell furniture; 11 — Paint, improve and sell artwork; 12 — Grow, harvest and sell produce; 13 — Work scheduled careers and earn promotions

**Status:** ready-for-agent

**Requirements:** R02, R12

## Acceptance criteria

- [ ] Show prerequisite and progress for each goal and locked item.
- [ ] Rewards key off domain achievements and are granted once across retries/devices.
- [ ] Free-build actions do not counterfeit earned goals; rewards cannot be claimed repeatedly.
- [ ] Register later social, family, business and neighborhood goals under the same event contract.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
