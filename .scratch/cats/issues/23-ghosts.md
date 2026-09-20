# 23 — Memorialize cats and receive ghost visits

**What to build:** Place memorials, read memories and receive occasional visits from deceased cats.

**Blocked by:** 21 — Age at a fixed pace and face old age; 17 — Develop friendships, rivalries and memories

**Status:** ready-for-agent

**Requirements:** R08, R22

## Acceptance criteria

- [ ] Create one memorial per death and preserve it when moved/stored.
- [ ] Ghost chance and visit cooldown use simulation nights and seeded RNG.
- [ ] Ghosts remain deceased, consume no living slots, cannot work/conceive and never restore life.
- [ ] Reload does not duplicate a visit; living cats can react and family history remains intact.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
