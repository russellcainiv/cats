# 24 — Own and operate a cat café

**What to build:** Buy the café business, stock it, serve orders and earn net profit.

**Blocked by:** 11 — Paint, improve and sell artwork; 13 — Work scheduled careers and earn promotions; 16 — Shop and visit neighborhood homes; 17 — Develop friendships, rivalries and memories

**Status:** ready-for-agent

**Requirements:** R12, R15, R24

## Acceptance criteria

- [ ] Implement ownership, hours, supplies, three recipes/products, customer orders, service and a profit summary.
- [ ] Revenue subtracts actual stock/costs; no infinite free customers or repeated order payouts.
- [ ] Handle closure, absent/dead owner, low needs, empty stock and interrupted orders.
- [ ] Customer identities, reputation, ledger and idempotent order settlement persist across devices.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
