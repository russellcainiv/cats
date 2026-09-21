# 44 — Expanded functional customization, furniture catalog, and room palettes

**What to build:** Deliver complete vertical slice for expanded functional furnishings (at least 64 usable items across 4 room styles), comprehensive cat and room customization palettes, explicit need-satisfaction affordances, and modular GPT Image rendering.

**Blocked by:** 07 — Place functional furniture and satisfy cat needs; 10 — Free-build and place walls and furniture anywhere on the lot; 40 — Complete reusable GPT Image artwork integration across rooms, lots, cats, outfits, and UI

**Status:** ready-for-agent

**Requirements:** R07, R10, R28, R32

## Acceptance criteria

- [ ] Implement expanded content catalog module (src/content/furniture/ and src/domain/building/adapter.ts) providing at least 64 unique functional and decorative items categorized across room styles (Cozy Cottage, Modern Cat, Whimsical Play, Rustic Garden), including multi-tile cat trees, scratch lounges, heated beds, climbing shelves, automatic fountains, puzzle feeders, and ambient lighting.
- [ ] Define explicit interaction affordances and need satisfaction for all functional items: cats can climb climbing shelves to satisfy Fun, scratch sisal lounges to satisfy Scratch need and preserve sofa durability, drink from bubbling fountains for Hydration/Thirst, and sleep in heated beds for high Comfort/Energy recovery.
- [ ] Expand cat customization and home aesthetics: implement 16 additional coat pattern variants, 8 eye color palettes, and 12 wardrobe accessories (collars, bows, bandanas, bells), plus reversible room wall/floor swatch palettes, with atomic preview and buy/undo transactions.
- [ ] Integrate modular GPT Image rendering pipeline for all 64+ items with directional sprites, placement bounding boxes, collision navmesh updates, and mobile touch placement controls with fluid drag/rotate gestures and price badge clearance.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
