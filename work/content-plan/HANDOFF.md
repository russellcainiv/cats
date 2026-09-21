# Expanded Content, Genetics, Full Art & Rare Discovery Handoff

## 1. Overview & Mission Delivery
- **Mission**: Incorporate confirmed family co-op decisions, percentage-based kitten genetics (R27, Task 39), complete reusable GPT Image artwork (R28, Task 40), broad collection and rare exploration discovery (R29, Task 41), feline-adapted activities with authentic instincts (R30, Task 42), durable multi-generation lineage and hybrid naming (R31, Task 43), and expanded functional customization/furniture (R32, Task 44).
- **Authority**: `SPEC-CONSOLIDATION-03-MISSION.md`, `FAMILY-GENETICS-DECISIONS-02.md`, `EXPANDED-CAT-ART-DIRECTION-03.md`, `LINEAGE-CUSTOMIZATION-05.md`.
- **Model Role**: AGY Gemini 3.8 Flash (High) documentation and planning worker.
- **Git Custody**:
  - Branch: `codex/feat-private-household-20260920`
  - Workspace: `/Users/russell/.codex/worktrees/cats-foundation/Cats`
  - HEAD Commit: `95bf9e525f48d625c1f61c86b6bd035b48cea73f`
- **Integrity Validation**: `python3 scripts/validate_plan.py all` passes with 32 confirmed requirements, 102 user stories, 44 tickets with 129 acyclic prerequisite edges, 44 task execution plans, and 6 rejected self-test cases.

---

## 2. Confirmed Decisions vs. Working Defaults

### Confirmed User Decisions (Authoritative)
1. **Shared Household**: Mother and daughter share the exact same household, 8 cats total, shared cottage, and shared family economy (`FAMILY-GENETICS-DECISIONS-02.md`).
2. **Two Simultaneous Devices**: Simultaneous play on two separate devices (desktop/laptop pointer + phone/tablet touch) with independent viewports and simultaneous active input.
3. **Player Cat Allocation (4 Cats Per Player)**: "they can both have up to 4 cats each". Hard limit of 4 living/reserved cat slots per player; 8 living/reserved total in household. Dam-primary with partner-overflow reservation; atomic conversion at birth; no silent reassignment, eviction, or deletion.
4. **Reusable GPT Image Artwork (R28)**: Coordinator generates modular GPT Image assets matching approved pastel cartoon and pixel neighborhood direction (`docs/art/approved-direction.png`). Engineering integrates assets into rendering pipelines, replacing placeholder emoji/blocks while preserving geometry, collision, and typography in code.
5. **Broad Cat Collection & Exploration Discovery (R29)**: Comprehensive catalog of domestic breeds (TICA/CFA grounded), mixed coats, rare wild cats, and mythical fantasy cats. Wild and fantasy cats are the rarest tiers, discovered and befriended through exploration only, never starter-created. Durable discovery without reload reroll exploits; full household befriending without forced eviction; no paid draws.
6. **Feline-Adapted Activities & Authentic Behaviors (R30)**: Career and hobby tasks performed using natural feline anatomy and paws (front-paw dough kneading, claw soil digging, paw canvas dabbing, jaw basket carrying) plus tailored 4-legged career uniforms without human torsos or hands, interspersed with authentic feline instincts (loafing, box napping, head-bunting, grooming, zoomies).
7. **Durable Lineage & Hybrid Breed Naming (R31)**: Multi-generation ancestry in `WorldState.lineage`, DAG acyclicity, 3-generation relatedness traversal preventing close-relative romance, and deterministic order-independent hybrid breed naming at birth (`sort([breedA, breedB]).join('x')`).
8. **Expanded Functional Customization & Furniture (R32)**: Expanded catalog with at least 64 usable furnishings across 4 styles (Cozy Cottage, Modern Cat, Whimsical Play, Rustic Garden), explicit feline need affordances, reversible room swatches, expanded cat palettes/accessories, and modular GPT Image rendering.

### Remaining Working Defaults (Designated Engineering Defaults)
1. **Shared Control vs. Segregated Control**:
   - **Working Default**: **Shared Care**. Both players can direct, care for, and nurture all 8 cats; color-coded reticles (Coral `#FF7A59` for Mom, Lavender `#A78BFA` for Daughter) and status indicators distinguish concurrent interactions.
   - *Alternative Policy*: Segregated control where each player can direct only her own 4 assigned cats.
2. **Offspring Inheritance Odds Policy**:
   - **Working Default**: **45% Dam / 45% Sire / 10% Novel Domestic Catalog** (`weighted_novel`).
   - *Alternative Policy*: **50% Dam / 50% Sire** (`strict_parents`).
   - Both policies are parameterized in `DEFAULT_INHERITANCE_ODDS`. Source probabilities are distinct from observable outcome odds: when parents share identical features, probabilities aggregate (e.g. 90% observable under 45/45/10; 100% under 50/50).
3. **Novel Mutation Rarity Guard**:
   - Novel 10% domestic roll draws strictly from common domestic catalog, NEVER handing out undiscovered fantasy or wild cats unless eligible rare parentage exists.
4. **Approved Palette Grounding**:
   - Primary and secondary fur colors inherit strictly within the approved palette: Black (`#1A1A1A`), White (`#FFFFFF`), Brown/Chocolate (`#8B5A2B`), Tan/Fawn (`#D2B48C`), Ginger (`#E67E22`), Grey/Silver (`#808080`), and Cream (`#F5E6D3`).

---

## 3. Concrete Asset-to-Capability Mapping

| Asset Category | Deliverable Asset Specifications | Consuming Tasks | Game Capabilities Supported |
|---|---|---|---|
| **Cutaway Architecture** | 32x32 isometric tile textures for rooms, cutaway walls, doorways, and flooring (wood, pastel tile, rug). | Task 02, 08, 40 | Overhead cutaway home view; room building; floor plan editing without full-screen static paste. |
| **Furnishings (30+ items)** | Modular sprite sheets for 30+ items across seating, sleep, care, play, skills, storage, and décor. | Task 07, 10, 40 | Furniture catalog placement, 90° rotation, color customization, and cell collision boundaries. |
| **Neighborhood Lots (7 lots)** | Pixel-detailed exterior tiles and facade sprites for Player Home, 3 Neighbor Homes, Park, Shop, and Café. | Task 15, 16, 24, 40 | Seamless travel, shop visits, park exploration encounters, and café business management. |
| **Domestic Cat Sprites** | 4 body meshes (petite, average, stocky, fluffy) with modular coat textures across 6 patterns and 7 approved palette colors. Grounded in TICA/CFA standards. | Task 04, 27, 39, 40, 41 | Cat Creator real-cat recreation; multi-layer PixiJS sprite assembly; kitten appearance inheritance. |
| **Rare Wild Cat Sprites** | Unique anatomical sprites and texture atlases for Scottish Wildcat, Pallas's Cat, Sand Cat, and Lynx. | Task 40, 41 | Rare exploration discoveries; neighborhood park encounters; Cat Dex recruitment. |
| **Mythical Fantasy Cat Sprites** | Original celestial/magical sprites for Moonlit Celestial, Cloud-Weaver, Sun-Gilded Pixie, and Starlight Shadow. | Task 40, 41 | Mythical seasonal encounters; highest-tier exploration milestones; Cat Dex completion. |
| **Quadruped Career Outfits** | Four-legged tailored garments: Café Assistant apron, Garden Keeper overalls, Gallery Helper smock/beret. | Task 13, 14, 40, 42 | Automatic uniform equip at departure, restore on return, rendering on world sprites and portraits. |
| **Feline Paw Action Animations** | Animated sprite sequences: front-paw dough kneading, front-claw soil digging, paw canvas dabbing, jaw basket carrying. | Task 11, 12, 13, 24, 42 | Authentic feline performance of human-like career and hobby activities without human hands. |
| **Feline Instinct Behaviors** | State-driven idle sequences: loafing, curling in cardboard boxes, mutual head-bunting, self-grooming, tail flicking, zoomies. | Task 06, 20, 42 | Autonomous free will, emotional expression, and authentic cat comedy. |
| **Cat Dex & UI Iconography** | Breed silhouette cards, discovery stamps, habitat badges, Coral/Lavender custody reticles, and HUD presence pills. | Task 35, 38, 39, 41 | Cat Dex exploration log, dual-device presence display, and family tree lineage navigation. |

---

## 4. Manifest & Verification Audit

### Updated Planning Artifacts
1. `docs/requirements.json`: 32 confirmed requirements (R01–R32).
2. `docs/tickets.json`: 44 complete vertical slice tickets (Tasks 01–44).
3. `.scratch/cats/issues/*.md`: 44 issue files (including repaired `39-*.md` through `42-*.md` and new `43-*.md`, `44-*.md`).
4. `.scratch/cats/spec.md`: Updated scope contract (R01–R32), 102 user stories, confirmed co-op decisions, and detailed architecture decisions.
5. `docs/architecture.md`: Updated with genetics schemas, GPT Image modularity, rare dex gating, feline animation contracts, lineage DAG contracts, and furniture catalog contracts.
6. `docs/contracts.md`: Updated with file responsibilities and TypeScript interface types for Tasks 39–44.
7. `docs/superpowers/plans/2026-09-20-cats.md`: 44 task execution sections with e2e test specifications and Integration Gates.
8. `docs/ticket-index.md` & `docs/decision-map.md`: Updated to 44 tickets and confirmed family decisions.
9. `START-HERE.md` & `README.md`: Updated to 32 requirements and 44 tickets with Content Addendum and Lineage & Customization Addendum links.
10. `.gauntlet/bar/CONTENT-ADDENDUM.md`: Created with Additive Gates 16–20.
11. `.gauntlet/bar/LINEAGE-CUSTOMIZATION-ADDENDUM.md`: Created with Additive Gates 21–24.
12. `scripts/validate_plan.py`: Requirement count check updated to 32.

### Verification Commands & Results
```sh
python3 scripts/validate_plan.py all
```
Output:
```text
PASS requirements: 32 decisions covered
PASS spec: 102 user stories and required sections
PASS tickets: 44 files; 129 acyclic prerequisite edges
PASS handoff: 44 task plans; exact approved picture; local links resolve
PASS self-test: 6 malformed manifests rejected
PASS all: planning integrity only; no game implementation claimed
```

### Invariant & Baseline Protection
- Tasks 01–32 acceptance criteria: 100% identical byte-for-byte to baseline HEAD.
- Base `.gauntlet/bar/BAR.md`: 100% identical byte-for-byte to baseline HEAD.
- Application code (`src/**`, `packages/**`, `tests/**`): Completely untouched.
- Peer worktrees and coordinator review files: Completely untouched.

---

## 5. Next Steps for Core Engine & Art Workers
1. **Coordinator / Critic**: Conduct independent blind review of Round 1 repair and Lineage/Customization additions.
2. **Core Engine Worker**: Implement genetics reducer (`src/domain/lifecycle/genetics.ts`), conception snapshots (`src/domain/lifecycle/snapshots.ts`), and lineage DAG (`src/domain/lifecycle/lineage.ts`) fulfilling Tasks 39 and 43.
3. **Exploration Worker**: Implement Cat Dex domain catalog and exploration scheduler fulfilling Task 41.
4. **Building Worker**: Implement expanded furniture catalog module (`src/content/furniture/`) and adapter (`src/domain/building/adapter.ts`) fulfilling Task 44.
5. **Renderer Worker**: Mount modular GPT Image assets in PixiJS containers and integrate feline paw animations fulfilling Tasks 40 and 42.
