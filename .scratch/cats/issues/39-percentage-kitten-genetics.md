# 39 — Percentage-based kitten inheritance of looks and traits with per-player capacity reservation

**What to build:** Deliver complete vertical slice for percentage-based kitten inheritance of looks and personality traits from both parents (45/45/10 working default, 50/50 configurable), immutable conception snapshots, provenance tracking, 4-slot-per-player capacity clamping in shared 8-cat households, safe migration, and responsive family tree / kitten inspection UI.

**Blocked by:** 19 — Moo-Moo, chance pregnancy and safe birth; 20 — Raise kittens and follow generations; 36 — Concurrent economy, building, and Moo-Moo conflict resolution

**Status:** ready-for-agent

**Requirements:** R16, R17, R19, R20, R21, R26, R27

## Acceptance criteria

- [ ] Implement inheritAppearance and inheritTraits supporting both 45/45/10 working default and 50/50 configurable odds via parameter with exact same-parent value aggregation, two-stage non-colliding trait selection, and zero-division guards on exhausted parent pools (novel catalog fallback under 45/45/10; pre-conception validation |PA u PB| >= 2 under 50/50 with actionable repair prompts for invalid legacy parents).
- [ ] Inherit only supported catalog features using approved art direction colors (primary/secondary colors within approved palette: Black, White, Brown, Tan, Ginger, Grey, Cream) and enforce the canonical invariant of exactly two distinct personality traits from canonical 10-trait catalog; strictly exclude career outfits, accessories, skills, and moods.
- [ ] Enforce lineage and rarity gating: novel 10% mutation rolls draw strictly from common domestic catalog, never producing undiscovered rare wild or fantasy breeds unless eligible rare ancestry exists.
- [ ] Execute deterministic canonical PRNG allocation sequence with zero rejection loops or rerolls, guaranteeing reproducible phenotypes and traits across client and server.
- [ ] Capture immutable ParentGeneticsSnapshot at conception; resolve birth against snapshot so parent death, career change, or departure during 3-day gestation cannot distort genetics.
- [ ] Enforce two-tier capacity invariant of 4 living/reserved cats per player and 8 per household; assign reserved kitten slots at conception (Dam-primary with partner-overflow) and atomically convert to living cats at birth without silent reassignment, eviction, or deletion.
- [ ] Persist immutable baseAppearance and KittenGeneticsProvenance on each kitten; migrate existing saves deterministically without RNG rerolls.
- [ ] Deliver responsive desktop/phone DOM HUD kitten birth card and Family Tree view displaying inheritance breakdown, Coral/Lavender custody indicators, with zero layout shift.
- [ ] Deliver the actual UI, domain behavior, persistence/API validation, failure states and tests for this slice. Do not mark complete for mock data, static screenshots, or an isolated domain function.
- [ ] Dogfood its whole workflow on desktop and phone; capture and OPEN every screenshot, record what was inspected, and fix visual defects before acceptance.
- [ ] Obtain independent blind review against the intended request, approved art, whole-game mission and regression risks. Preserve all acceptance criteria.

## Verification

- Start with the observable scenario in the implementation plan for this ticket; prove a meaningful failure before implementing, then pass it with real behavior.
- Exercise each failure and persistence case above through the highest viable application seam. Record test commands, exact commit, screenshot paths and reviewer verdict.
- Update the requirement-to-evidence ledger. A PR or commit alone is not completion; do not close until the mission and applicable release gates are met.

## Model handoff

Read the full spec, behavioral contracts, approved art and this ticket's plan task before editing. Claim only this slice and its listed files; coordinate changes to shared command/save contracts. Follow prerequisites by evidence, not just an issue's status. Numeric balancing defaults are proposed and tunable; confirmed scope is not.
