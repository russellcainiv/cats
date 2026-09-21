# 35 — Multi-actor world presence, selection reticles, and shared pause semantics

**What to build:** Coral and Lavender reticles on Pixi canvas; HUD presence avatars; instant cooperative pause and zero-advance pause banner.

**Blocked by:** 02 — Select and move an animated cat in the approved world; 34 — Real-time SSE transport, command sequencing, and authoritative host lease

**Status:** ready-for-agent

**Requirements:** R01, R04, R09, R26

## Acceptance criteria

- [ ] PixiJS viewport renders distinctive pastel selection reticles (Mom: Coral ring #FF7A59; Daughter: Lavender ring #A78BFA) over the respective cat each player has selected; selection is visual-only and non-exclusive.
- [ ] HUD presence bar displays connected family members with active/away indicators and selected cat portraits; clicking partner's portrait smoothly pans camera to their target cat.
- [ ] Either player can press the Pause button at any time; coop_pause command broadcasts instantly, setting isPaused = true, stopping fixed-step sim advance on all clients, and displaying a prominent banner stating who paused (Paused by Daughter or Paused by Mom).
- [ ] While paused, all cat needs decay, career departure timers, and aging advance strictly cease; unpausing broadcasts coop_resume and resumes synchronized fixed-step simulation.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
