# 27 — Complete coherent game art and content

**What to build:** Furnish and play the whole world using the complete initial functional catalog and consistent animation.

**Blocked by:** 07 — Buy, place, recolor, move, rotate and sell furniture; 08 — Build the floor plan, rooms and finishes; 11 — Paint, improve and sell artwork; 12 — Grow, harvest and sell produce; 14 — Complete goals and unlock content; 15 — Travel to a lively persistent neighborhood; 16 — Shop and visit neighborhood homes; 19 — Moo-Moo, chance pregnancy and safe birth; 23 — Memorialize cats and receive ghost visits; 24 — Own and operate a cat café

**Status:** ready-for-agent

**Requirements:** R05, R06, R24, R25

## Acceptance criteria

- [ ] Meet the spec content inventory: creator choices, object functions/variants, locations, NPCs, crops, careers, recipes and goals.
- [ ] Every item has stable ID, icon, footprint, interaction anchors, cost and runtime assets; no dead buttons or missing textures.
- [ ] Produce clean consistent sprites/tiles/animation from approved direction; record provenance and manifest hashes.
- [ ] Inspect all affected desktop and phone states against the approved picture without using the picture as production scenery.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
