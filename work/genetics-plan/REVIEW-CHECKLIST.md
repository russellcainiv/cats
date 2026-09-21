# Percentage-Based Kitten Genetics Blind Review Checklist

This checklist provides the independent review criteria for evaluating the percentage-based kitten genetics contract and Task 39 specification prior to coordinator integration.

---

## 1. User Authority & Scope Invariants

- [ ] **Confirmed User Requirements Honored**:
  - [ ] Shared household between 2 players simultaneously on separate devices is preserved.
  - [ ] Hard limit of 4 living/reserved cats per player and 8 living/reserved cats total in household is strictly enforced.
  - [ ] Percentage-based inheritance of looks and traits from each parent is explicitly modeled.
  - [ ] Clear disclaimer that inheritance is a fun game simulation mechanic, not a claim of biological genetics.
- [ ] **Configurable Odds Policies Documented**:
  - [ ] Working recommendation (Policy Alpha: 45% Dam / 45% Sire / 10% Novel Catalog) is fully detailed.
  - [ ] Alternative user choice (Policy Beta: 50% Dam / 50% Sire / 0% Novel) is fully detailed.
  - [ ] Both policies execute through the same parameterized engine adapter without code branches.
- [ ] **Strict Boundary Preservation**:
  - [ ] Zero modifications to files outside `work/orchestrator/genetics-plan/**`.
  - [ ] Zero mutations of Tasks 01–32 baseline or Tasks 33–38 co-op tasks.
  - [ ] No application code claimed as implemented; deliverable remains purely planning and contract artifacts.

---

## 2. Appearance & Personality Trait Grounding

- [ ] **Grounded Appearance Catalog**:
  - [ ] Grounded directly in `src/domain/state.ts` and Cat Creator inventory.
  - [ ] Covers all 6 core physical appearance features: `breed`, `primaryColor`, `secondaryColor`, `pattern`, `eyeColor`, and `bodyType`.
  - [ ] Non-inherited visual properties (`collarColor`, `accessoryId`, `expression`) are explicitly excluded.
- [ ] **Personality Traits**:
  - [ ] Offspring inherit exactly two distinct personality traits from the 10-trait catalog (`src/domain/state.ts`).
  - [ ] Inherited traits never produce duplicates (`['playful', 'playful']` is impossible).
- [ ] **Strict Non-Inheritance List**:
  - [ ] Career clothes (`careerOutfit`) and job rank are strictly not inherited (kittens start unemployed and unclothed).
  - [ ] Learned skills (`hunting`, `climbing`, `socializing`, etc.) reset to baseline level 1.
  - [ ] Transient needs (`hunger`, `energy`, etc.) and moods reset to pristine kitten defaults.
  - [ ] Household money, personal inventory, and external social relationships are not inherited.

---

## 3. Mathematical & Algorithmic Rigor

- [ ] **Same-Parent-Value Aggregation**:
  - [ ] Distinguishes between Gene Source (which parent was rolled) and Observable Outcome (visible color/pattern).
  - [ ] When Dam and Sire share the same attribute value, observable probability correctly sums:
    $P(V) = 45\% + 45\% = 90\%$ (or $50\% + 50\% = 100\%$).
  - [ ] Novel roll ($10\%$) draws strictly from `Catalog \ { ParentValues }`, guaranteeing a distinct new feature without accidental parent rerolls.
- [ ] **Duplicate & Incompatible Trait Resolution**:
  - [ ] Rejection while-loops (`while (traitsSet.size < 2)`) are eliminated.
  - [ ] Dynamic weight redistribution is applied when a candidate pool is exhausted, preserving mathematically honest advertised odds.
- [ ] **Deterministic Canonical PRNG Allocation Order**:
  - [ ] Canonical sequence of PRNG draws (`nextRng(rng)`) is specified per kitten.
  - [ ] Exactly fixed, bounded number of PRNG draws per kitten.
  - [ ] Guaranteed deterministic output across all environments from identical seeds.

---

## 4. Conception Snapshots, Lifecycle & Co-Op Invariants

- [ ] **Immutable Conception Snapshots**:
  - [ ] `ParentGeneticsSnapshot` is captured on `PregnancyRecord` at the moment of conception.
  - [ ] Kitten generation at birth reads exclusively from the snapshot.
  - [ ] Carrier or sire death, outfit change, or move-out during 3-day gestation cannot alter kitten genetics.
- [ ] **Carrier Decease Handling**:
  - [ ] If carrier Dam passes away during gestation, pregnancy is cleanly aborted and capacity slots are released.
- [ ] **Unknown Sire Handling**:
  - [ ] Missing sire falls back to documented Adoption Catalog baseline (50% Dam / 50% Catalog baseline).
- [ ] **4-Slot-Per-Player Capacity Clamping**:
  - [ ] Total living + reserved slots per player never exceeds 4.
  - [ ] Conception litter size is clamped to available household capacity ($F_D + F_S$).
  - [ ] Slot reservation uses Dam-primary with partner-overflow logic; each reserved slot is explicitly owned.
  - [ ] Birth conversion is atomic; existing living cats are never silently reassigned.
- [ ] **Core Simulation Preservation**:
  - [ ] 25% conception rate on completed Moo-Moo preserved.
  - [ ] 1–3 litter size preserved.
  - [ ] 3-day gestation (4,320 sim minutes) preserved.
  - [ ] Mutual readiness and adult stage requirements preserved.
  - [ ] Kinship guards (incest blocked with 0 PRNG draws) preserved.
  - [ ] Full-capacity Moo-Moo proceeds as romance with 0 PRNG draws preserved.

---

## 5. UI Presentation, Migration & Verification

- [ ] **Save Migration**:
  - [ ] Existing saves (Tasks 01–38) load without altering existing cat looks or traits.
  - [ ] Legacy starter cats receive `geneticsProvenance: null` (Gen 1).
  - [ ] Older 3-field appearances normalize deterministically without RNG.
- [ ] **UI Presentation**:
  - [ ] DOM HUD kitten birth card displays expandable `"Inherited Looks & Traits"` with provenance badges and probability percentages.
  - [ ] Family Tree view displays generation levels and color-coded player custody (Coral `#FF7A59` for Mom, Lavender `#A78BFA` for Daughter).
  - [ ] Responsive design verified for desktop and mobile touch viewports (390px width, 48px touch targets, zero overflow).
- [ ] **Test Coverage Specified**:
  - [ ] Exact seed unit tests for reproducibility.
  - [ ] 10,000-iteration Monte Carlo distribution test asserting $\pm 1.5\%$ tolerance.
  - [ ] Co-op concurrency tests for simultaneous dual-client births and capacity clamping under race conditions.
  - [ ] Playwright E2E dual-context browser tests.

---

## 6. Review Verdict & Recommendations

- [ ] **Plan Integrity Check**: `python3 scripts/validate_plan.py all` executed and passing.
- [ ] **Coordinator Readiness**: Ready for handoff to Coordinator for integration into master task index after Tasks 33–38 owners finish.
