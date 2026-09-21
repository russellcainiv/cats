# Expanded Content, Full Art, Rare Dex & Kitten Genetics Plan Progress

## 1. Context & Authority
- **Mission**: Incorporate confirmed family decisions, kitten genetics (R27/Task 39), full reusable GPT Image artwork (R28/Task 40), broad collection and rare wild/fantasy discovery (R29/Task 41), and feline-adapted activities with authentic instincts (R30/Task 42).
- **Source Mission File**: `work/orchestrator/SPEC-CONSOLIDATION-03-MISSION.md`
- **Context Files**: `work/orchestrator/FAMILY-GENETICS-DECISIONS-02.md`, `work/orchestrator/EXPANDED-CAT-ART-DIRECTION-03.md`, `work/orchestrator/genetics-plan/**`, `work/orchestrator/coop-plan/**`.
- **Conversation / Transcript ID**: `8dfad57c-9994-49a8-a122-abcd2b694b31`
- **Git Custody**:
  - Branch: `codex/feat-private-household-20260920`
  - Workspace: `/Users/russell/.codex/worktrees/cats-foundation/Cats`
  - Active Model: AGY Gemini 3.8 Flash (High) documentation and planning worker
  - HEAD Commit: `95bf9e525f48d625c1f61c86b6bd035b48cea73f`
- **Scope Boundaries**:
  - Owned: Specification/planning manifests (`docs/requirements.json`, `docs/tickets.json`, `.scratch/cats/spec.md`, `docs/contracts.md`, `docs/architecture.md`, `docs/ticket-index.md`, `docs/decision-map.md`, `START-HERE.md`, `README.md`, `docs/superpowers/plans/2026-09-20-cats.md`), new task mirrors 33 onward (`.scratch/cats/issues/33-*.md` through `42-*.md`), planning validator requirement count only (`scripts/validate_plan.py`), `work/orchestrator/coop-plan/**` (stale language correction), `work/orchestrator/content-plan/**` (new plan artifacts, progress, handoff), and additive gauntlet addendum.
  - Strictly Preserved: Tasks 01–32 acceptance criteria (byte-for-byte), base `.gauntlet/bar/BAR.md` (byte-for-byte), application/server/UI/domain code, peer worktrees, and coordinator/review files.

## 2. Decision Log & Confirmed Authority vs Working Defaults
1. **Shared Household**: **CONFIRMED** by user (Option 1). Mother and daughter share the exact same household, 8 cats total, shared cottage, and economy.
2. **Two Simultaneous Devices**: **CONFIRMED** by user. Mother on laptop/desktop, daughter on phone/tablet, simultaneous active input and independent cameras.
3. **Capacity Allocation**: **CONFIRMED** by user: "they can both have up to 4 cats each". Hard limit of 4 living/reserved cats per player; 8 living/reserved total in household. Dam-primary with partner-overflow reservation; atomic conversion at birth; no silent reassignment, eviction, or deletion.
4. **Shared Control (Optional Choice)**: **WORKING DEFAULT**: Both players can direct and care for all cats, with visible player reticles and partner indicators.
5. **Genetics Odds (Optional Choice)**: **WORKING DEFAULT**: 45% Dam / 45% Sire / 10% Novel Domestic Mutation (`weighted_novel`). Alternative: 50% Dam / 50% Sire (`strict_parents`). Configurable via single policy adapter.
6. **Novel Mutation Rarity Guard**: Novel 10% domestic roll draws strictly from common domestic catalog, NEVER handing out undiscovered fantasy or wild cats unless eligible rare ancestry exists.
7. **Complete Reusable GPT Image Artwork (R28)**: Coordinator generates modular GPT Image assets; engineering integrates into rendering pipelines; replaces placeholder emoji/blocks; preserves layout/collision/typography in code.
8. **Broad Cat Collection & Exploration Dex (R29)**: TICA/CFA grounded domestic breeds, mixed coats, rare wild cats, and mythical fantasy cats. Wild and fantasy are rarest tiers, discovered/befriended through exploration, never starter-created. Durable discovery, no reload rerolls, no paid draws.
9. **Feline-Adapted Activities (R30)**: Human-like careers/hobbies performed with feline anatomy/paws (dough kneading, claw digging, paw painting, basket carrying) plus authentic feline instincts (loafing, box-napping, grooming, zoomies).
10. **Durable Lineage & Hybrid Breed Naming (R31, Task 43)**: Multi-generation ancestry in `WorldState.lineage`, DAG acyclicity validation, 3-generation relatedness/inbreeding prevention traversal, deterministic order-independent hybrid breed naming at birth (`sort([breedA, breedB]).join('x')`), preserving foundation breeds and generation depth (F1, F2).
11. **Expanded Functional Customization & Furniture (R32, Task 44)**: Expanded catalog with at least 64 usable furnishings across 4 styles (Cozy Cottage, Modern Cat, Whimsical Play, Rustic Garden), explicit feline need affordances (Fun from climbing, Scratch need and sofa protection from sisal, Hydration from fountains, Comfort/Energy from heated beds), reversible swatches, expanded cat palettes/accessories, and modular GPT Image rendering.

## 3. Execution Steps Completed
- [x] Step 1: Initialize task-owned `work/orchestrator/content-plan/PROGRESS.md`.
- [x] Step 2: Correct stale "unconfirmed" statements in `work/orchestrator/coop-plan/**` (`PLAN.md`, `DECISION-MATRIX.md`, `CONTRACTS.md`, `TASKS.md`, `COOP-SCOPE-ADDITION.md`) and update co-op docs with confirmed household and device status.
- [x] Step 3: Update `docs/requirements.json` to 32 requirements (adding R27 genetics, R28 GPT Image art, R29 rare dex & exploration, R30 feline activities, R31 durable lineage & hybrid naming, R32 expanded functional customization/furniture).
- [x] Step 4: Update `docs/tickets.json` with additive Tasks 39 (genetics), 40 (GPT Image art), 41 (rare cat dex), 42 (feline animations & behavior), 43 (lineage & hybrid naming), and 44 (expanded furniture & customization), ensuring each has >=4 substantive criteria, strict dependency order, and complete fields.
- [x] Step 5: Create and repair issue files `.scratch/cats/issues/39-*` through `44-*` matching `tickets.json` criteria exactly.
- [x] Step 6: Update `.scratch/cats/spec.md` with confirmed family decisions, R27–R32, 20 new user stories (stories 83–102), and matching architecture/testing decisions.
- [x] Step 7: Update `docs/architecture.md` and `docs/contracts.md` with genetics schemas, art asset contracts, rare dex catalog, feline animation models, lineage DAG/hybrid naming contracts, and expanded furniture catalog adapter contracts.
- [x] Step 8: Update `docs/superpowers/plans/2026-09-20-cats.md` with implementation tasks 39–44, e2e test paths, and Integration Gates.
- [x] Step 9: Update `docs/ticket-index.md`, `docs/decision-map.md`, `START-HERE.md`, `README.md` to reflect 32 requirements, 44 tasks, and confirmed decisions.
- [x] Step 10: Create `.gauntlet/bar/CONTENT-ADDENDUM.md` (Gates 16–20) and `.gauntlet/bar/LINEAGE-CUSTOMIZATION-ADDENDUM.md` (Gates 21–24).
- [x] Step 11: Update `scripts/validate_plan.py` requirement count check to 32.
- [x] Step 12: Run `python3 scripts/validate_plan.py all` and verify all checks pass.
- [x] Step 13: Write and update `work/orchestrator/content-plan/HANDOFF.md`.

## 4. Verification Evidence

### Command Execution: `python3 scripts/validate_plan.py all`
```text
PASS requirements: 32 decisions covered
PASS spec: 102 user stories and required sections
PASS tickets: 44 files; 129 acyclic prerequisite edges
PASS handoff: 44 task plans; exact approved picture; local links resolve
PASS self-test: 6 malformed manifests rejected
PASS all: planning integrity only; no game implementation claimed
```

### Invariant & Integrity Checks
- `git diff HEAD -- .gauntlet/bar/BAR.md`: 0 diff lines (byte-for-byte identical).
- `git diff HEAD -- src/`: 0 diff lines (untouched).
- Original tickets 01–32 in `docs/tickets.json` and `.scratch/cats/issues/01-32`: 100% identical byte-for-byte.
- All local markdown links in `spec.md`, `START-HERE.md`, `README.md`, `ticket-index.md`, and implementation plan resolve to existing files.

## 5. Remaining Gates & Next Executable Action
- **Remaining Gates**:
  - Independent blind review of Round 1 repair by critic/coordinator.
  - GPT Image asset batch generation by coordinator.
  - Domain implementation of Task 39 (genetics reducer and snapshots) by Core Engine worker.
- **Blockers**: None.
- **Next Executable Action**: Coordinator triggers independent blind review of the complete 32-requirement, 44-task plan and reviews updated evidence.
