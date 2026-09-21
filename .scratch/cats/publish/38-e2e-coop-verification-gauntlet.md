# 38 — End-to-end mother-daughter co-op verification on physical desktop and phone

**What to build:** Full dual-device physical dogfooding (desktop mouse + phone touch) passing all 5 Co-Op Gauntlet Gates with zero regressions.

**Blocked by:** 28 — Finish all controls for touch, keyboard and mouse; 31 — Blind-review and dogfood the complete game; 35 — Multi-actor world presence, selection reticles, and shared pause semantics; 36 — Concurrent economy, building, and Moo-Moo conflict resolution; 37 — Shared-room host failover, offline zero-advance, and two-device reconnection recovery

**Status:** ready-for-agent

**Requirements:** R01, R04, R05, R08, R09, R10, R14, R20, R21, R26

## Acceptance criteria

- [ ] Both devices (Desktop mouse/keyboard and Phone/Tablet touch) simultaneously control different cats, interact with furniture, feed, play, and build without UI overlap, clipping, or input blocking.
- [ ] Career clothing renders accurately on both viewports when a cat leaves for work and restores upon return; 8-cat limit holds firm under all family actions.
- [ ] Physical network disconnects (airplane mode toggle on phone, Wi-Fi reconnection) recover within 5 seconds without desync or duplicate cats.
- [ ] Independent blind review and physical dogfooding capture passes all 5 Co-Op Gauntlet Gates with zero defects.
- [ ] Preserves all original Task 01–32 baseline requirements and criteria intact with zero regression.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
