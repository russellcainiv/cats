# 28 — Finish all controls for touch, keyboard and mouse

**What to build:** Complete every care/build/social/business action on phones and computers comfortably.

**Blocked by:** 10 — Offer free-build without money exploits; 16 — Shop and visit neighborhood homes; 19 — Moo-Moo, chance pregnancy and safe birth; 24 — Own and operate a cat café; 26 — Make the private gift welcoming and understandable; 27 — Complete coherent game art and content

**Status:** ready-for-agent

**Requirements:** R04, R05

## Acceptance criteria

- [ ] Portrait/landscape safe areas, keyboard, dialogs and HUD do not hide confirm/cancel or selected cat.
- [ ] Use 44px targets, readable text, focus management, non-color status cues and DOM alternatives to canvas actions.
- [ ] Pinch, pan, panel scroll and pointer cancellation never commit build or social actions accidentally.
- [ ] Open every captured state and fix clipping, overlap, missing stacking and horizontal overflow before acceptance.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
