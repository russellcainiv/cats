# 16 — Shop and visit neighborhood homes

**What to build:** Enter shops, buy goods and visit other cats at home.

**Blocked by:** 15 — Travel to a lively persistent neighborhood; 07 — Buy, place, recolor, move, rotate and sell furniture

**Status:** ready-for-agent

**Requirements:** R24

## Acceptance criteria

- [ ] Purchases commit stock, inventory and funds together.
- [ ] Hours, invitations/access and object permissions govern entry and use.
- [ ] Visiting NPC homes does not grant build ownership; all mutation commands check lot ownership.
- [ ] Closed shops, depleted stock, capacity, interrupted travel and insufficient money have actionable states.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
