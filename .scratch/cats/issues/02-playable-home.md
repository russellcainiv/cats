# 02 — Select and move an animated cat in the approved world

**What to build:** Open a rendered home, select a cat, and move it around furniture by touch or mouse.

**Blocked by:** 01 — Create and resume a private saved household

**Status:** ready-for-agent

**Requirements:** R01, R04, R05, R25

## Acceptance criteria

- [ ] Use separate sprites, tiles, collision and controls; the approved picture is never the playable background.
- [ ] Selection updates a DOM cat panel and movement follows reachable paths without teleporting through objects.
- [ ] Pan, zoom, selection, cancel and pointer-cancel work on desktop and phone without hover-only actions.
- [ ] Position persists, unreachable paths explain failure, and renderer loss offers recovery.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
