# 39 — Percentage-based kitten inheritance of looks and traits with per-player capacity reservation

**What to build:** Deliver complete vertical slice for percentage-based kitten inheritance of looks and personality traits from both parents (45/45/10 working default, 50/50 configurable alternative), immutable conception snapshots, provenance tracking, 4-slot-per-player capacity clamping in shared 8-cat households, safe migration, and responsive family tree / kitten inspection UI.

**Blocked by:** 19 — Moo-Moo, chance pregnancy and safe birth; 20 — Raise kittens and follow generations; 36 — Concurrent actions & conflict resolution

**Status:** ready-for-agent

**Requirements:** R16, R17, R19, R20, R21, R26, R27

**Module:** `simulation`

**UI Action / Button:** `"Inspect kitten inheritance"`

**Test ID:** `"kitten-genetics-breakdown"`

**Expected Text:** `"Inherited from Mom (Mochi)"`

---

## Acceptance Criteria

1. **Percentage Inheritance Engine & Configurable Odds Policy**:
   - Deliver `inheritAppearance` and `inheritTraits` in `src/domain/lifecycle/genetics.ts` executing the specifications in `work/orchestrator/genetics-plan/GENETICS-CONTRACT.md`.
   - Support both **Policy Alpha** (`weighted_novel`: 45% Dam, 45% Sire, 10% Novel Catalog) and **Policy Beta** (`strict_parents`: 50% Dam, 50% Sire, 0% Novel) via a single parameterized configuration object (`DEFAULT_INHERITANCE_ODDS`).
   - When Dam and Sire share identical values for a feature, aggregate observable probabilities accurately (e.g. 90% Dam+Sire, 10% Novel under Policy Alpha; 100% under Policy Beta).
   - Inherit exactly two distinct personality traits per kitten; handle duplicate/exhausted parent trait pools via dynamic proportional weight redistribution without unbounded `while` loops or dishonest advertised probabilities.

2. **Grounded Feature Catalogs & Strict Inheritance Exclusion**:
   - Inherit only supported catalog features: `breed`, `primaryColor`, `secondaryColor`, `pattern`, `eyeColor`, and `bodyType`, plus 2 personality traits from the 10-trait catalog.
   - Strictly exclude from genetic inheritance: career outfits (`careerOutfit`), equipped collars/accessories (`collarColor`, `accessoryId`), learned skills (reset to kitten baseline level 1), transient needs/moods (initialized to pristine starter values), jobs/careers, household money, and transient health hazards.

3. **Deterministic Canonical PRNG Allocation Order**:
   - Execute a strictly bounded sequence of PRNG rolls using `nextRng(rng)` per kitten: breed, primary color, pattern, secondary color, eye color, body type, trait 1 source/index, trait 2 source/index.
   - Zero rejection rerolls or non-deterministic loops; identical seed and parent inputs produce identical phenotypes, traits, and provenance across all client and server environments.

4. **Conception Parent Snapshots & Lifecycle Invariants**:
   - Capture an immutable `ParentGeneticsSnapshot` for Dam and Sire on the `PregnancyRecord` at the exact tick of conception.
   - Resolve kitten inheritance at birth solely against `parentSnapshots`, guaranteeing that parent career changes, move-outs, or death during the 3-day gestation (4,320 sim minutes) cannot distort genetics.
   - If Sire is unknown/null, handle missing parent cleanly via Adoption Catalog baseline (50% Dam / 50% Catalog baseline).
   - If carrier Dam passes away, terminate pregnancy immediately and release reserved capacity slots with zero orphaned state.
   - Preserve 25% conception roll on completed Moo-Moo, 1–3 litter size, mutual readiness, and kinship guards (incest pairings blocked with 0 PRNG draws).

5. **Co-Op 4-Slot-Per-Player Capacity Clamping & Atomic Slot Conversion**:
   - Enforce hard capacity invariant: $\le 4$ living/reserved cats per player, $\le 8$ total living/reserved cats in household.
   - Clamp litter size at conception to available family capacity ($F_D + F_S$). If household capacity is full, Moo-Moo proceeds as intimacy with zero conception roll and zero PRNG consumption.
   - Assign reserved kitten slots at conception using Dam-primary with partner-overflow logic; each reserved slot explicitly stores `assignedMemberId: 'mom' | 'daughter'`.
   - At birth, atomically convert reserved slots into living cats assigned to their pre-allocated player; living cats are never silently reassigned, evicted, or traded on birth or disconnect.

6. **Immutable Provenance & Save Migration**:
   - Persist `baseAppearance`, current `appearance`, and comprehensive `KittenGeneticsProvenance` (including exact source, probability, PRNG roll value, and parent IDs) on each kitten record.
   - Preserve `baseAppearance` immutability when cats equip clothes or accessories.
   - Migrate existing saves (Tasks 01–38) safely without RNG: existing cats receive `geneticsProvenance: null` (starter generation) and 3-field appearances normalize deterministically without altering existing cat looks or traits.

7. **Dual-Client Co-Op Presentation & Mobile/Desktop UI**:
   - In DOM HUD, kitten birth card displays interactive `"Inherited Looks & Traits"` accordion with provenance badges (`"Inherited from Mom (Mochi)"`, `"Novel Surprise!"`) and exact probability chips (`"90% chance"`).
   - In Family Tree view, display generation depth (`Gen 1`, `Gen 2`), kinship connections, and player custody indicators (Coral `#FF7A59` for Mom, Lavender `#A78BFA` for Daughter).
   - Fully accessible and responsive: 48px minimum touch targets, zero horizontal scrolling or clipping on mobile viewports down to 390px width.
   - Simultaneous births across two active co-op sessions synchronize over SSE transport without race conditions or duplicate cats.

---

## Verification & Testing

1. **Exact Seed & Boundary Unit Tests** (`tests/domain/lifecycle/genetics.test.ts`):
   - Verify deterministic generation across 10 fixed seeds; assert exact byte-for-byte phenotype match.
   - Verify same-parent attribute aggregation ($V_A = V_B$) produces 90% combined observable chance under Policy Alpha and 100% under Policy Beta.
   - Verify duplicate trait resolution: when Dam and Sire share traits or when Dam has only 1 trait, ensure 2 distinct traits are selected without infinite loops.
   - Verify unknown Sire fallback to catalog baseline.
   - Verify carrier death terminates pregnancy and restores capacity slots.

2. **Deterministic Monte Carlo Distribution Tests** (`tests/domain/lifecycle/genetics-distribution.test.ts`):
   - Run 10,000 deterministic simulated kitten births from parents with distinct attributes.
   - Assert empirical source frequencies match theoretical weights within rigorous tolerances ($\pm 1.5\%$):
     - Parent A source: $45.0\% \pm 1.5\%$
     - Parent B source: $45.0\% \pm 1.5\%$
     - Novel mutation source: $10.0\% \pm 1.5\%$
   - Verify Policy Beta produces $50.0\% \pm 1.5\%$ Parent A and $50.0\% \pm 1.5\%$ Parent B with $0\%$ novel mutations.

3. **Co-Op Concurrency & Capacity Tests** (`tests/integration/coop-genetics-capacity.test.ts`):
   - Simulate simultaneous Moo-Moo conceptions and simultaneous births across two client contexts.
   - Verify that when Mom has 3 cats and Daughter has 4 cats, litter size is strictly clamped to 1, allocated to Mom.
   - Verify that when both players have 4 cats, conception roll is completely skipped with 0 PRNG draws.
   - Verify atomic CAS prevents duplicate kitten creation on network retries or simultaneous birth triggers.

4. **E2E Dual-Context UI Tests** (`tests/e2e/kitten-genetics-ui.spec.ts`):
   - Desktop viewport (1280x800) and Mobile touch viewport (390x844) simultaneously open shared household.
   - Trigger birth; assert kitten announcement card renders with testid `kitten-genetics-breakdown` and expected text `"Inherited from Mom (Mochi)"`.
   - Inspect family tree on mobile touch screen; assert Coral and Lavender reticles/lines render without layout shift or horizontal overflow.

5. **Independent Blind Review**:
   - Undergo independent blind review against approved game art direction, co-op mission, and zero regression of Tasks 01–38 baseline.

---

## Model Handoff Notes

- Read `work/orchestrator/genetics-plan/GENETICS-CONTRACT.md` before editing domain code.
- Coordinate with Core Engine worker for integration into `src/domain/lifecycle/` and `src/domain/state.ts`.
- Ensure `python3 scripts/validate_plan.py all` passes when this ticket is merged into shared manifests.
