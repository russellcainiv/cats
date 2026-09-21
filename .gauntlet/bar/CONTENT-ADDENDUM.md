# Cats Gauntlet — Expanded Content, Genetics, Art & Rare Discovery Addendum

This document defines the **additive verification gates** for the expanded content extensions:
- Kitten Genetics & Inheritance (Requirement R27, Task 39)
- Complete Reusable GPT Image Artwork (Requirement R28, Task 40)
- Broad Cat Collection & Rare Exploration Discovery (Requirement R29, Task 41)
- Feline-Adapted Activities & Authentic Behaviors (Requirement R30, Task 42)

It **appends to and strictly reinforces** the frozen acceptance bar defined in `.gauntlet/bar/BAR.md` and the co-op gates in `.gauntlet/bar/COOP-ADDENDUM.md`.
The original 10 hard gates in `BAR.md` and 5 co-op gates in `COOP-ADDENDUM.md` remain completely intact, frozen, and mandatory.

---

## Additive Content Hard Gates

### Gate 16: Mathematical & Algorithmic Genetics Rigor
- **Standard**:
  1. Offspring inheritance of looks and traits must strictly follow the configured policy (default: 45% Dam / 45% Sire / 10% Novel Domestic Catalog; alternative: 50% Dam / 50% Sire).
  2. When Dam and Sire share identical feature values, observable probabilities must aggregate correctly (e.g. 90% observable chance under 45/45/10; 100% under 50/50).
  3. Novel mutation rolls (10%) must draw strictly from the common domestic catalog using approved palette colors; novel rolls must **never** award undiscovered wild or fantasy cats.
  4. Offspring must inherit exactly two distinct personality traits from the canonical 10-trait catalog; exhausted parent pools must redistribute weight dynamically without rejection while loops or distorted odds.
  5. PRNG sequence per kitten must execute a fixed, bounded order of draws, guaranteeing identical byte-for-byte phenotype generation across client and server.
  6. Parent genetics snapshots must be captured immutably at conception; carrier death during gestation must terminate pregnancy safely and restore reserved capacity with zero orphaned records.
- **Physical Verification**: Monte Carlo unit test suites with 10,000 deterministic simulated births proving empirical distribution matches theoretical weights within $\pm 1.5\%$.

### Gate 17: Per-Player 4-Slot Capacity Clamping & Immutable Provenance
- **Standard**:
  1. The simulation must enforce the two-tier capacity invariant: $\le 4$ living/reserved cats per family player, $\le 8$ total living/reserved cats in the household.
  2. At conception, kitten slots are reserved deterministically using Dam-primary with partner-overflow logic (`assignedMemberId: 'mom' | 'daughter'`).
  3. At birth, reserved slots convert atomically to living cats assigned to their allocated player; living cats are never silently reassigned, evicted, or deleted on birth or disconnect.
  4. Immutable `baseAppearance` and comprehensive `KittenGeneticsProvenance` (including exact source, probability, PRNG roll value, and parent IDs) must persist on each kitten record. Career clothing or hats must never mutate `baseAppearance`.
  5. Existing saves must migrate deterministically with `geneticsProvenance: null` and legacy appearance normalization without RNG rerolls.
- **Physical Verification**: Concurrent co-op conception fixtures verifying slot clamping when one player is at 3 and partner is at 4, and zero-roll bypass when both are at 4.

### Gate 18: Complete Modular GPT Image Artwork Integration
- **Standard**:
  1. All visible game surfaces (cutaway rooms, furnishings, 7 lots, cat world sprites, portraits, career clothing, tools, crops, recipes, neighborhood tiles, and UI icons) must render from modular, reusable GPT Image originals matching the approved pastel cartoon and pixel neighborhood direction (`docs/art/approved-direction.png`).
  2. Procedural colored rectangles and emoji placeholders are strictly prohibited in completed gameplay.
  3. The approved concept picture must never be pasted as a static full-screen gameplay background; layout geometry, pathfinding navmeshes, collision bounds, and typography must remain in code.
  4. Texture atlases and sprite sheets must load with graceful fallbacks and maintain 60fps rendering with zero layout shift on desktop (1280x800) and mobile touch (390x844).
- **Physical Verification**: Visual inspection of all 7 lots and all 30+ furnishings across desktop and mobile viewports with zero asset 404s or rendering artifacts.

### Gate 19: Exploration-Based Rare Cat Discovery & Gating
- **Standard**:
  1. Domestic breeds must be grounded in official TICA and CFA appearance standards; the catalog must provide domestic breeds, mixed coats, rare wild cats (Scottish Wildcat, Pallas's Cat, Sand Cat, Lynx), and mythical fantasy cats (Moonlit Celestial, Cloud-Weaver, Sun-Gilded Pixie, Starlight Shadow).
  2. Wild and fantasy cats are the rarest tiers and must **never** be selectable or unlocked in the starter Cat Creator. They must only be encountered and befriended through outdoor neighborhood exploration, park events, and seasonal encounters.
  3. Discovery states, encounter logs, and friendship progress must persist deterministically across reloads, disconnects, and device swaps; no reload reroll exploits.
  4. Full-household befriending must be supported: when a household is at capacity (4 per player / 8 total), rare cats can still be befriended as neighborhood friends who visit regularly without forced eviction of existing pets. When player capacity opens, befriended cats can be recruited.
  5. No paid draws, loot boxes, or randomized microtransactions.
- **Physical Verification**: Exploration workflow test executing encounter, befriending, Cat Dex persistence across reload, and capacity-gated recruitment.

### Gate 20: Authentic Feline Adaptation & Natural Instinct Behaviors
- **Standard**:
  1. Human-like career and hobby activities must be authentically adapted to feline quadruped anatomy and paws (front-paw dough kneading, claw soil digging, paw canvas dabbing, jaw basket carrying). Strictly no human hands or human torsos.
  2. Four-legged tailored career uniforms (apron, overalls, smock/beret) must fit natural cat anatomy without distortion, equipping on shift departure and restoring on return.
  3. Authentic feline instinct behaviors must be fully animated: loafing, cardboard box napping, mutual head-bunting, self-grooming, tail flick communication, spontaneous zoomies, and distraction by toys.
  4. Behavior animations must synchronize across co-op sessions and maintain 60fps across desktop and mobile viewports.
- **Physical Verification**: E2E browser tests inspecting animated career shifts, hobby activities, and idle behaviors on both desktop and mobile viewports.
