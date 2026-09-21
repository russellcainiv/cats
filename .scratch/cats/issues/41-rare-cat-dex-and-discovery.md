# 41 — Broad domestic, wild, and fantasy cat catalog with exploration discovery and dex recruitment

**What to build:** Deliver complete vertical slice for broad cat collection catalog grounded in TICA/CFA domestic standards, exploration encounter scheduler, persistent befriending and recruitment flow, and discovery Cat Dex UI with durable state.

**Blocked by:** 04 — Create real or imaginary cats; 15 — Travel to a lively persistent neighborhood; 16 — Visit shops, buy items and host visiting neighborhood cats; 17 — Form friendships and rivalries between cats; 39 — Percentage-based kitten inheritance of looks and traits with per-player capacity reservation

**Status:** ready-for-agent

**Requirements:** R04, R07, R15, R24, R27, R29

## Acceptance criteria

- [ ] Implement comprehensive cat catalog featuring common domestic breeds (grounded in official TICA/CFA appearance standards), mixed coats, rare wild cats (e.g. Scottish Wildcat, Pallas's Cat, Sand Cat, Lynx), and mythical fantasy cats (e.g. Moonlit Celestial, Cloud-Weaver, Sun-Gilded Pixie, Starlight Shadow).
- [ ] Enforce strict acquisition gating: starter Cat Creator permits only domestic and mixed recreation (preserving real-cat creation); wild and fantasy cats form the rarest tiers with concrete category encounter weights (70% Common Domestic, 24% Uncommon Domestic, 5% Rare Domestic, 0.75% Rare Wild across 8 species, 0.25% Mythical Fantasy across 8 forms) and can ONLY be discovered through outdoor neighborhood exploration.
- [ ] Execute deterministic exploration encounter scheduler governed by active simulation time (1 real second = 1 sim minute; 60 sim minutes active window; 0 delta when paused/offline); active encounters persist in world.neighborhood.activeEncounters so reload, revisit, or co-op views return the exact same encounter without reroll exploits.
- [ ] Support full-household befriending and recruitment flow: befriended rare cats can be invited to join when player capacity allows (<= 4 per player, <= 8 household); at full capacity, befriended cats remain persistent neighborhood friends who visit regularly without forced eviction of existing cats.
- [ ] Deliver responsive Cat Dex collection UI on desktop and phone displaying discovered breeds, encounter logs, habitat lore, and recruitment status with zero pay-to-draw mechanics or randomized microtransactions.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
