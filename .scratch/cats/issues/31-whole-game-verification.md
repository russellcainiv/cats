# 31 — Blind-review and dogfood the complete game

**What to build:** Independently verify every requirement, the art direction, security and real phone/desktop play.

**Blocked by:** 28 — Finish all controls for touch, keyboard and mouse; 30 — Balance a complete household lifetime

**Status:** ready-for-agent

**Requirements:** R01, R02, R04, R05, R09, R10, R25

## Acceptance criteria

- [ ] Map every requirement/story to passing behavior tests or reviewed manual evidence on the exact commit.
- [ ] Dogfood Chrome/Safari desktop and mobile Safari/Chrome, including real-device smoke and cross-device resume.
- [ ] Measure full-content scene frame times, input delay, initial load, bounded memory trend and save payload.
- [ ] Verify private access, owner isolation, writer fencing, no secrets, no production fixtures and no untested visible actions.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
