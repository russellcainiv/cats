# Cats Gauntlet — Lineage & Customization Addendum

This document defines the **additive verification gates** for the lineage and customization extensions:
- Durable Multi-Generation Lineage Tree, Relatedness Guards, and Hybrid Naming (Requirement R31, Task 43)
- Expanded Functional Customization, Furniture Catalog, and Room Palettes (Requirement R32, Task 44)

It **appends to and strictly reinforces** the frozen acceptance bar defined in `.gauntlet/bar/BAR.md`, `.gauntlet/bar/COOP-ADDENDUM.md`, and `.gauntlet/bar/CONTENT-ADDENDUM.md`.
The original 10 hard gates in `BAR.md`, 5 co-op gates in `COOP-ADDENDUM.md`, and 5 content gates in `CONTENT-ADDENDUM.md` remain completely intact, frozen, and mandatory.

---

## Additive Lineage & Customization Hard Gates

### Gate 21: Lineage Graph Durability, DAG Integrity & Inbreeding Prevention
- **Standard**:
  1. Multi-generation ancestry must be modeled as a strict Directed Acyclic Graph (DAG) in `WorldState.lineage`, where each node stores immutable lineageId, parent IDs, conception snapshot, and memorial/ghost status.
  2. Ancestor nodes must persist indefinitely across cat deaths, memorials, adoptions, and member churn; no ancestor node may be erased or corrupted.
  3. Cycle prevention: insertion or parent linking must strictly reject cycles with an invariant validation check.
  4. Genealogical relatedness traversal (`areCatsRelated(catA, catB, maxGenerations = 3)`) must evaluate common ancestors across parent-child, full/half siblings, and grandparent-grandchild relationships.
  5. Any romantic or Moo-Moo action between related cats must be blocked prior to RNG consumption, displaying gentle, ethical explanatory in-game feedback ("Mochi and Luna are too closely related to romance").
- **Physical Verification**: Graph unit test suite verifying cycle rejection, deep 4-generation ancestor traversal, and Moo-Moo blockage across parent-child, sibling, and grandparent-grandchild pairs.

### Gate 22: Deterministic Order-Independent Hybrid Breed Naming Engine
- **Standard**:
  1. Hybrid breed names must generate strictly at birth when Dam and Sire are of distinct breeds, never on unsuccessful romance, conception, or starter cat creation.
  2. Naming recipe key must be order-independent: `sort([breedA, breedB]).join('x')` guarantees that Dam Bengal x Sire Ragdoll and Dam Ragdoll x Sire Bengal produce the exact same coined hybrid breed name (e.g. `Ragdal`).
  3. Exact foundation breeds and generation depth (e.g. `F1`, `F2`) must be preserved in lineage metadata; unbounded string concatenation or hyphenation (e.g. `Bengal-Ragdoll-Siamese-Persian`) is strictly forbidden.
  4. Hybrid naming must never bypass rare cat discovery gating (a hybrid cannot unlock an undiscovered rare wild or fantasy breed).
  5. Save migration must preserve existing cat breed designations without retroactively altering established identities or rerolling appearance.
- **Physical Verification**: Deterministic test suite verifying commutativity (`hybrid(A, B) === hybrid(B, A)`), F1/F2 depth tracking, and exact recipe resolution across all registered breed pairs.

### Gate 23: Expanded 64+ Usable Furnishings with Real Need Affordances
- **Standard**:
  1. Content catalog must provide at least 64 unique functional and decorative items categorized across 4 cohesive styles: Cozy Cottage, Modern Cat, Whimsical Play, and Rustic Garden.
  2. Functional items must define explicit feline need satisfaction and interaction affordances:
     - Climbing shelves / multi-tile cat trees: satisfy Fun and exercise.
     - Sisal scratch lounges: satisfy Scratch need and protect sofa/wall durability from scratch damage.
     - Automatic water fountains: satisfy Hydration/Thirst.
     - Heated cat beds: deliver high Comfort and accelerated Energy recovery.
     - Puzzle feeders: satisfy Hunger with mental stimulation (Fun boost).
  3. Catalog modularity: new furnishings must be registered via `src/content/furniture/` and connected through `src/domain/building/adapter.ts`, preventing monolith file sprawl.
  4. Catalog numbers must not be claimed as implemented until both assets and interactive behaviors are fully verified.
- **Physical Verification**: Building catalog inspection and autonomous cat need-satisfaction test proving all 64+ items are purchasable, placeable, and interactable, with measured need deltas.

### Gate 24: Reversible Palettes, Wardrobe Customization & Touch Placement Parity
- **Standard**:
  1. Cat customization must include at least 16 additional coat pattern variants, 8 eye color palettes, and 12 wardrobe accessories (collars, bows, bandanas, bells) using approved art palettes.
  2. Room wall and floor swatches must be fully reversible with instant visual preview and atomic buy/undo transactions, preventing accidental spend or irreversible cosmetic overrides.
  3. Wardrobe items and collar accessories must never mutate a cat's hereditary `baseAppearance`.
  4. Modular GPT Image rendering for all 64+ items must include directional sprites, placement bounding boxes, collision navmesh updates, and mobile touch placement controls with fluid drag/rotate gestures and price badge clearance.
- **Physical Verification**: Browser seam tests on Desktop (1280x800) and Phone (390x844) executing furniture placement, rotation, swatch preview/undo, and wardrobe accessory equip with zero visual clipping or horizontal overflow.
