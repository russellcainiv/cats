# 40 — Complete reusable GPT Image artwork integration across rooms, lots, cats, outfits, and UI

**What to build:** Deliver complete vertical slice integrating reusable GPT Image visual assets across cutaway rooms, 30+ furnishings, 7 lots, cat base sprites and portraits, career uniforms, tools, and UI icons, replacing procedural placeholders with approved art direction.

**Blocked by:** 02 — Select and move an animated cat in the approved world; 07 — Buy, place, recolor, move, rotate and sell furniture; 15 — Travel to a lively persistent neighborhood; 27 — Incorporate original art assets and expand catalog content

**Status:** ready-for-agent

**Requirements:** R05, R06, R24, R25, R28

## Acceptance criteria

- [ ] Integrate modular GPT Image sprite sheets and texture atlases matching approved pastel cartoon and pixel neighborhood art direction (docs/art/approved-direction.png) across cutaway rooms, 7 lots, and all 30+ canonical furnishings without static full-screen pastes.
- [ ] Render layered cat sprite components (base body types, coat colors/patterns, eye colors, career uniforms, and collar accessories) and matching high-resolution dialogue/inspection portraits in PixiJS and DOM viewports.
- [ ] Replace procedural geometric placeholder blocks and emoji with authentic game art assets while preserving underlying grid geometry, pathfinding collision meshes, and typography rendering in code.
- [ ] Deliver asset loading, caching, fallback handling, and responsive scaling ensuring zero layout shift and smooth 60fps rendering across desktop (1280x800) and mobile touch (390x844) viewports.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
