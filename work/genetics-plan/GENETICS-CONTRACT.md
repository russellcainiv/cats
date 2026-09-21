# Percentage-Based Kitten Genetics & Inheritance Contract

## 1. Overview & Authority

### 1.1 Purpose
This contract defines the comprehensive percentage-based kitten inheritance specification for the Cats simulation. It establishes the mathematical models, canonical PRNG allocation sequence, domain schemas, provenance persistence, co-op multi-player slot ownership, migration compatibility, and UI requirements for kitten traits and appearance.

### 1.2 User Authority & Context
- **Authority**:
  - `work/orchestrator/GENETICS-PLAN-MISSION.md`
  - `work/orchestrator/FAMILY-GENETICS-DECISIONS-02.md`
  - Requirement R26 (Private family co-op) & Additive Requirement R27 (Kitten genetics)
- **Confirmed User Mandate**:
  - Two players share one household simultaneously from separate devices (desktop & mobile).
  - Hard limit of four cats per player, eight living/reserved cats total in household.
  - Percentage chances for offspring traits and looks inherited from each parent.
- **Nature of the System**:
  - Treat probabilities strictly as an engaging game mechanic, not a claim of biological genetics or Mendelian accuracy.

---

## 2. Grounded Domain Catalogs & Schemas

### 2.1 Supported Appearance Features
Grounding directly in `src/domain/state.ts` and the Cat Creator inventory (`04-cat-creator.md`):

| Feature Key | Data Type | Valid Catalog / Enum Values | Inheritance Source |
| :--- | :--- | :--- | :--- |
| `breed` | `string` | `'domestic_shorthair'`, `'calico'`, `'siamese'`, `'persian'`, `'tabby'`, `'maine_coon'`, `'ragdoll'`, `'british_shorthair'` | Dam / Sire / Novel Catalog |
| `primaryColor` | `string` (Hex) | Approved Creator Palette: `'#1A1A1A'` (Black), `'#FFFFFF'` (White), `'#8B5A2B'` (Brown/Chocolate), `'#D2B48C'` (Tan/Fawn), `'#E67E22'` (Ginger), `'#808080'` (Grey/Silver), `'#F5E6D3'` (Cream) | Dam / Sire / Novel Catalog |
| `secondaryColor`| `string \| null`| Same palette as `primaryColor`, or `null` for solid patterns | Dam / Sire / Pattern Default |
| `pattern` | `enum` | `'solid'`, `'tabby'`, `'bicolor'`, `'calico'`, `'tortoiseshell'`, `'pointed'` | Dam / Sire / Novel Catalog |
| `eyeColor` | `enum` | `'green'`, `'amber'`, `'blue'`, `'copper'`, `'heterochromia'` | Dam / Sire / Novel Catalog |
| `bodyType` | `enum` | `'petite'`, `'average'`, `'stocky'`, `'fluffy'` | Dam / Sire / Novel Catalog |

### 2.2 Personality Traits Catalog
Kittens inherit **exactly two** distinct personality traits from the canonical catalog of 10 traits (`src/domain/state.ts`):
```typescript
export const ALL_PERSONALITY_TRAITS: PersonalityTrait[] = [
  'playful',
  'lazy',
  'affectionate',
  'aloof',
  'skittish',
  'curious',
  'glutton',
  'vocal',
  'mischievous',
  'zen',
];
```

### 2.3 Strict Inheritance Exclusion List (Non-Inherited Attributes)
The following attributes are **strictly excluded** from genetics and must never be passed down:
1. **Career Outfits & Work Status** (`careerOutfit`, `isAtWork`): Kittens start with `careerOutfit: null`, `jobId: null`. Work clothes are worn only when an adult leaves for their career.
2. **Current Clothes & Accessories** (`collarColor`, `accessoryId`): Collars, hats, and items are player-equipped or purchased; kittens are born unclothed (`collarColor: undefined`, `accessoryId: undefined`).
3. **Acquired Skills** (`hunting`, `climbing`, `socializing`, `charisma`, `agility`, `creativity`, `tinkering`): Starter skills reset to kitten baseline (all level 1), never inherited from parents' learned skills.
4. **Transient Needs & Moods** (`hunger`, `energy`, `hygiene`, `comfort`, `social`, `fun`, `bladder`, `moodScore`, `moodBand`): Kittens initialize with pristine starter needs (e.g. 100).
5. **Careers, Money & Status** (`jobId`, `careerRank`, `walletBalance`): Kittens cannot work; funds belong to household.
6. **Social Relationships**: Kittens initialize relationships with parent bonding affinities; external friendships/rivalries are never inherited.
7. **Health Hazards & Deceased Status**: Illnesses, fire risks, and death are strictly transient/individual.

---

## 3. Generalized Inheritance Odds Policy

### 3.1 Mathematical Formulation
For each inherited feature, the selection probability is partitioned across three sources:
- $w_A$: Weight of Parent A (Dam / Mother)
- $w_B$: Weight of Parent B (Sire / Father)
- $w_{\text{novel}}$: Weight of Novel Mutation (valid value from catalog not present in parents)
- **Invariant**: $w_A + w_B + w_{\text{novel}} = 1.000$ (100.0%)

### 3.2 Candidate Policies
1. **Policy Alpha — Weighted Novelty (Working Recommendation / Default)**:
   - $w_A = 0.45$ (45% Mother)
   - $w_B = 0.45$ (45% Father)
   - $w_{\text{novel}} = 0.10$ (10% Novel Surprise from Catalog)
   - *Rationale*: Offspring look and act like their parents while creating rare, delightful variations that keep multi-generational play fresh and surprising.
2. **Policy Beta — Strict Parental (Alternative Asked by User)**:
   - $w_A = 0.50$ (50% Mother)
   - $w_B = 0.50$ (50% Father)
   - $w_{\text{novel}} = 0.00$ (0% Mutation)
   - *Rationale*: Strict Mendelian-style game selection where every inherited attribute must originate directly from one of the two parents.

### 3.3 Configurable Adapter Contract
Both policies plug into a single universal engine without altering control flow:
```typescript
export interface InheritanceOddsConfig {
  policyId: 'weighted_novel' | 'strict_parents';
  weightParentA: number; // 0.45 or 0.50
  weightParentB: number; // 0.45 or 0.50
  weightNovel: number;   // 0.10 or 0.00
}

export const DEFAULT_INHERITANCE_ODDS: InheritanceOddsConfig = {
  policyId: 'weighted_novel',
  weightParentA: 0.45,
  weightParentB: 0.45,
  weightNovel: 0.10,
};
```

---

## 4. Deterministic Canonical RNG Allocation Order

### 4.1 PRNG Engine Invariant
All genetic rolls utilize the game's pure, seeded pseudo-random number generator:
`nextRng(state: RngStateData): [number, RngStateData]` where returned float $r \in [0.0, 1.0)$.
All random calls consume sequential rolls in an immutable, deterministic order.

### 4.2 Exact Allocation Sequence Per Kitten
For each kitten $k \in \{0, \dots, \text{litterSize} - 1\}$:

```
[Roll 01] -> Breed Source Roll (r_breed_source)
  [Optional Roll 01b] -> Breed Novel Index (if source == 'novel')
[Roll 02] -> Primary Color Source Roll (r_pcolor_source)
  [Optional Roll 02b] -> Primary Color Novel Index (if source == 'novel')
[Roll 03] -> Pattern Source Roll (r_pattern_source)
  [Optional Roll 03b] -> Pattern Novel Index (if source == 'novel')
[Roll 04] -> Secondary Color Source Roll (r_scolor_source)
  [Optional Roll 04b] -> Secondary Color Novel Index (if source == 'novel')
[Roll 05] -> Eye Color Source Roll (r_eye_source)
  [Optional Roll 05b] -> Eye Color Novel Index (if source == 'novel')
[Roll 06] -> Body Type Source Roll (r_body_source)
  [Optional Roll 06b] -> Body Type Novel Index (if source == 'novel')
[Roll 07] -> Trait 1 Source Roll (r_t1_source)
[Roll 08] -> Trait 1 Selection Index (r_t1_idx)
[Roll 09] -> Trait 2 Source Roll (r_t2_source)
[Roll 10] -> Trait 2 Selection Index (r_t2_idx)
```

**Zero Rejection Loops**: Unlike naive implementations with `while (traitsSet.size < 2)` that burn arbitrary PRNG cycles, this sequence executes bounded rolls. Every call is bounded and deterministic.

---

## 5. Same-Parent-Value Aggregation & Bounded Selection

### 5.1 Gene Source vs Observable Outcome
A critical distinction must be maintained between **Gene Source** (provenance) and **Observable Outcome** (visible phenotype):
- **Gene Source**: Did the allele come from Dam, Sire, or Novel mutation?
- **Observable Outcome**: What is the actual visible value (e.g. `'green'` eyes)?

### 5.2 Aggregation Formula
When Dam and Sire possess the **same value** for a feature $F$ ($V_A = V_B = V$):
1. **Source Resolution**:
   - If $r < w_A \implies$ Source is recorded as `dam`.
   - If $w_A \le r < (w_A + w_B) \implies$ Source is recorded as `sire`.
   - In both cases, the visible value is $V$.
2. **Novel Candidate Pool Definition**:
   - The Novel Candidate Pool $C_{\text{novel}}$ is defined as:
     $$C_{\text{novel}} = \text{Catalog}(F) \setminus \{ V_A, V_B \}$$
   - This ensures that if a Novel roll occurs ($r \ge w_A + w_B$), it **guarantees** a distinct new value. It never accidentally re-rolls the parents' value.
3. **Observable Probability Computation**:
   - If $V_A = V_B = V$:
     $$P(\text{Outcome} = V) = w_A + w_B = 0.45 + 0.45 = 0.90\ (90\%)$$
     $$P(\text{Outcome} \neq V) = w_{\text{novel}} = 0.10\ (10\%)$$
     *(Under Policy Beta: $0.50 + 0.50 = 1.00$ / 100%)*
   - If $V_A \neq V_B$:
     $$P(\text{Outcome} = V_A) = w_A = 0.45\ (45\%)$$
     $$P(\text{Outcome} = V_B) = w_B = 0.45\ (45\%)$$
     $$P(\text{Outcome} \in C_{\text{novel}}) = w_{\text{novel}} = 0.10\ (10\%)$$

---

## 6. Duplicate and Incompatible Trait Resolution

### 6.1 Honest Advertised Odds & Canonical 2-Trait Invariant
Every cat in the world must possess **exactly two distinct personality traits** (`traits: [PersonalityTrait, PersonalityTrait]` where `traits[0] !== traits[1]`) drawn from the canonical 10-trait catalog (`ALL_PERSONALITY_TRAITS`: `playful`, `lazy`, `affectionate`, `aloof`, `skittish`, `curious`, `glutton`, `vocal`, `mischievous`, `zen`).
Advertised odds shown in the UI must match the actual statistical chances. Systems that silently reroll on duplicate traits distort probabilities (e.g. advertising 45% Dam trait, but rerolling to Novel when Dam has no other traits).

### 6.2 Two-Stage Non-Colliding Trait Allocation

1. **Pre-Conception Feasibility Validation (Policy Beta Guard)**:
   - Before Moo-Moo romance can trigger conception, the engine validates that the combined distinct parental traits set satisfies:
     $$|P_A \cup P_B| \ge 2$$
   - Because canonical cats always have 2 distinct traits, any pair of valid parents guarantees $|P_A \cup P_B| \ge 2$ (feasibility is guaranteed for all current cats).
   - If an invalid legacy parent (e.g. created prior to 2-trait validation with $\le 1$ trait) attempts romance under Policy Beta (`strict_parents`, $w_{\text{novel}} = 0$), romance succeeds as affection only, and the UI displays an actionable repair prompt (`CANNOT_CONCEIVE_INSUFFICIENT_PARENT_TRAITS`), allowing the player to select a second trait for the legacy cat without silent rerolls or data corruption.

2. **Trait 1 Allocation**:
   - Candidate pools: $P_A = \text{Traits}(Dam)$, $P_B = \text{Traits}(Sire)$, $P_{\text{novel}} = \text{Catalog} \setminus (P_A \cup P_B)$.
   - Source is selected by $r_{\text{t1\_source}}$ against $(w_A, w_B, w_{\text{novel}})$.
   - If Dam and Sire share traits ($P_A \cap P_B \neq \emptyset$), identical-trait outcomes aggregate honestly:
     $$P(T) = \sum_{S \in \{A, B\}: T \in P_S} w_S \cdot \frac{1}{|P_S|}$$
     *(e.g., under 45/45/10 with both parents having identical trait sets, $P(T_1) = 45\%$, $P(T_2) = 45\%$, novel catalog = $10\%$, summing to 100%).*
   - Specific trait $T_1$ is selected by $r_{\text{t1\_idx}}$ from the chosen pool: $\text{idx} = \lfloor r \times |P_{\text{source}}| \rfloor$.

3. **Trait 2 Allocation (Exclusion, Weight Redistribution & Division-by-Zero Guard)**:
   - For Trait 2, candidate pools are updated to strictly exclude $T_1$:
     $$P_A' = P_A \setminus \{ T_1 \}$$
     $$P_B' = P_B \setminus \{ T_1 \}$$
     $$P_{\text{novel}}' = P_{\text{novel}} \setminus \{ T_1 \}$$
   - **Exhausted Pool Weight Redistribution Rule**:
     - Case A: Both parents still have remaining traits ($|P_A'| > 0$ and $|P_B'| > 0$):
       Weights remain $(w_A, w_B, w_{\text{novel}})$.
     - Case B: Exactly one parent pool becomes empty (e.g. $|P_A'| = 0$ while $|P_B'| > 0$):
       $w_A$ is dynamically redistributed proportionally across non-exhausted pools:
       $$w_B' = \frac{w_B}{w_B + w_{\text{novel}}}, \quad w_{\text{novel}}' = \frac{w_{\text{novel}}}{w_B + w_{\text{novel}}}$$
       *(Under Policy Alpha: $w_B' = \frac{0.45}{0.55} \approx 0.8182$, $w_{\text{novel}}' = \frac{0.10}{0.55} \approx 0.1818$)*
       *(Under Policy Beta: $w_B' = 1.000$, $w_{\text{novel}}' = 0.000$)*
     - Case C: Both parental pools become empty ($|P_A'| = 0$ and $|P_B'| = 0$, occurring if both parents had only 1 unique trait between them):
       - Under Policy Alpha ($w_{\text{novel}} = 0.10$): Denominator $w_B + w_{\text{novel}} = 0.10$. Trait 2 draws 100% from $P_{\text{novel}}'$, recording provenance `{ source: 'novel_catalog_fallback', odds: 1.0 }`. Division by zero is avoided.
       - Under Policy Beta ($w_{\text{novel}} = 0$): Pre-conception validation rule 1 guarantees this state cannot be reached during conception. In the event of a defensive fallback, Trait 2 draws from $P_{\text{novel}}'$ with provenance `'emergency_catalog_fallback'`, preventing any `0/0` (`NaN`) crash.
   - Source for Trait 2 is selected by $r_{\text{t2\_source}}$ against $(w_A', w_B', w_{\text{novel}}')$.
   - Specific trait $T_2$ is selected by $r_{\text{t2\_idx}}$ from $P_{\text{source}}'$.
   - Both traits are guaranteed distinct ($T_1 \neq T_2$) with exact mathematical accounting and zero unbounded while loops.

---

## 7. Unavailable Parent & Conception Snapshots

### 7.1 Immutable Conception Snapshot
Conception occurs at simulation minute $T_{\text{conception}}$. Birth occurs 3 simulation days later ($T_{\text{conception}} + 4320$ sim minutes). During gestation, parents may level up skills, change outfits, move out, or even pass away.
To guarantee deterministic, immutable inheritance:
- **At the exact tick of conception**, an immutable `ParentGeneticsSnapshot` is embedded directly into the `PregnancyRecord`.

```typescript
export interface ParentGeneticsSnapshot {
  catId: string;
  name: string;
  baseAppearance: CatAppearance;
  traits: PersonalityTrait[];
  generation: number;
  ownerMemberId: 'mom' | 'daughter';
}

export interface PregnancyRecord {
  pregnancyId: string;
  householdId: string;
  damId: string;
  sireId: string | null;
  conceivedAtSimMinute: number;
  dueAtSimMinute: number;
  litterSize: number;
  reservedSlotAllocations: Array<{
    kittenIndex: number;
    assignedMemberId: 'mom' | 'daughter';
  }>;
  parentSnapshots: {
    dam: ParentGeneticsSnapshot;
    sire: ParentGeneticsSnapshot | null;
  };
  resolved: boolean;
}
```

### 7.2 Unknown / Stray Sire Handling
If Sire is `null` (e.g. stray NPC cat or mystery breeding):
- `parentSnapshots.sire` is set to `null`.
- Missing parent weight is handled cleanly:
  - **Explicit Default**: Dam provides 50%, Adoption Catalog Baseline provides 50%.
  - Provenance records `source: 'catalog_baseline'` with `sireId: null`.

### 7.3 Carrier (Dam) Decease Handling
In accordance with Requirement R22 and Task 20:
- If the carrier Dam passes away or suffers an irreversible loss event during gestation:
  - The pregnancy is terminated immediately.
  - All reserved kitten capacity slots are atomically released back to the respective players.
  - Zero ghost pregnancies or orphaned records are left in domain state.

---

## 8. Immutable Phenotype & Provenance Persistence

### 8.1 Domain Schemas
Each kitten record created at birth permanently records its genetic provenance:

```typescript
export interface FeatureProvenance {
  feature: 'breed' | 'primaryColor' | 'secondaryColor' | 'pattern' | 'eyeColor' | 'bodyType';
  source: 'dam' | 'sire' | 'novel' | 'catalog_baseline';
  sourceParentId?: string;
  sourceValue: string | null;
  rolledValue: string;
  sourceProbability: number;          // e.g. 0.45
  effectiveOutcomeProbability: number; // e.g. 0.90 if both parents share value
  rngRoll: number;                     // exact float [0, 1) from PRNG
}

export interface TraitProvenance {
  slot: 1 | 2;
  source: 'dam' | 'sire' | 'novel';
  sourceParentId?: string;
  trait: PersonalityTrait;
  conditionalProbability: number;
  rngRollSource: number;
  rngRollIndex: number;
}

export interface KittenGeneticsProvenance {
  version: 1;
  policy: 'weighted_novel' | 'strict_parents';
  conceivedAtSimMinute: number;
  bornAtSimMinute: number;
  damId: string;
  sireId: string | null;
  damGeneration: number;
  sireGeneration: number;
  kittenGeneration: number;
  features: {
    breed: FeatureProvenance;
    primaryColor: FeatureProvenance;
    secondaryColor?: FeatureProvenance;
    pattern: FeatureProvenance;
    eyeColor: FeatureProvenance;
    bodyType: FeatureProvenance;
  };
  traits: [TraitProvenance, TraitProvenance];
}
```

### 8.2 Invariant Guarantees
- `kitten.baseAppearance` and `kitten.geneticsProvenance` are written once at birth and are **strictly immutable**.
- Equipping career clothes or hats alters `cat.appearance`, but `cat.baseAppearance` remains pristine and is the sole basis for future generations.
- `kitten.generation = Math.max(damGen, sireGen ?? 0) + 1`.

---

## 9. Safe Migration & Backfill

### 9.1 Zero Reroll Policy
Existing saves from Tasks 01–38 must load seamlessly without altering existing cats.
1. **Existing Starter Cats**:
   - Cats created prior to Task 39 lack `geneticsProvenance`.
   - Migration sets `geneticsProvenance: null` and `family.generation = 1`.
   - Never roll retroactive genetics for existing cats.
2. **Appearance Schema Normalization**:
   - For older 3-field `CatAppearance` records (`coatColor`, `coatPattern`, `eyeColor`), normalize deterministically without RNG:
     ```typescript
     primaryColor: legacy.coatColor,
     pattern: legacy.coatPattern,
     eyeColor: legacy.eyeColor,
     breed: 'domestic_shorthair',
     bodyType: 'average',
     secondaryColor: null
     ```

---

## 10. Co-Op Slot Clamping & Multi-Player Capacity Allocation

### 10.1 Capacity Invariants
1. **Household Cap**: Total living cats + total reserved pregnancy slots $\le 8$.
2. **Player Cap**: For each family member $M \in \{\text{'mom'}, \text{'daughter'}\}$:
   $$\text{livingCats}(M) + \text{reservedSlots}(M) \le 4$$

### 10.2 Conception Capacity Check & Slot Allocation
When Moo-Moo completes between Dam (belonging to Member $M_D$) and Sire (belonging to Member $M_S$):
1. **Free Slot Calculation**:
   $$F_D = 4 - (\text{living}(M_D) + \text{reserved}(M_D))$$
   $$F_S = 4 - (\text{living}(M_S) + \text{reserved}(M_S))$$
   $$F_{\text{household}} = F_D + F_S$$
2. **Conception Capacity Gate**:
   - If $F_{\text{household}} == 0$: Moo-Moo completes as affectionate social action; conception roll is **bypassed** with 0 PRNG draws.
   - If $F_{\text{household}} > 0$: Proceed to conception roll (25% chance).
3. **Litter Size Clamping**:
   - Raw litter size rolled: 1 (50%), 2 (35%), 3 (15%).
   - Effective litter size: $\text{litterSize} = \min(\text{rawLitter}, F_{\text{household}})$.
4. **Kitten Slot Assignment (Dam-Primary with Partner Overflow)**:
   - Reserved slots are assigned deterministically:
     - Slot 1 $\to M_D$ (Dam owner) if $F_D > 0$, else $M_S$.
     - Slot 2 $\to M_S$ (Sire owner) if $F_S > 0$, else $M_D$.
     - Slot 3 $\to$ Whichever member still has remaining capacity.
   - Every reserved kitten has a guaranteed, non-overflowing slot reserved specifically for Mom or Daughter.
5. **Atomic Birth Conversion**:
   - At birth, the reserved slots are converted into living cats assigned to their pre-allocated player.
   - Living cats are never silently reassigned, evicted, or traded on birth or disconnect.

---

## 11. Family Tree & Kitten UI Presentation

### 11.1 Kitten Birth Inspection Card (DOM HUD)
- When a kitten is born, the delivery announcement card provides:
  1. Kitten portrait with rendered base appearance.
  2. Name input field (prefilled with default, editable).
  3. Player custody badge: `"Belongs to Mom"` (Coral pill `#FF7A59`) or `"Belongs to Daughter"` (Lavender pill `#A78BFA`).
  4. Expandable **"Inherited Looks & Traits"** section:
     - Shows each feature with provenance badge:
       - `"Eyes: Green"` $\to$ `"Inherited from Mom (Mochi) [90% chance: 45% Mom + 45% Dad]"`
       - `"Coat: Spotted Tabby"` $\to$ `"Inherited from Dad (Oliver) [45% chance]"`
       - `"Body: Fluffy"` $\to$ `"Novel Surprise! [10% chance]"`
     - Shows traits:
       - `"Playful"` $\to$ `"From Mom (Mochi)"`
       - `"Curious"` $\to$ `"From Dad (Oliver)"`

### 11.2 Family Tree Navigation
- Family tree view supports:
  - Generation levels clearly marked (`Gen 1`, `Gen 2`, `Gen 3`).
  - Connecting lines color-coded by player custody (Coral and Lavender).
  - Tap/click on any cat displays its genetic breakdown card.
  - Distinguishes living, deceased (memorialized), and moved-out ancestors.

### 11.3 Responsive Mobile/Desktop Touch Parity
- All buttons and expandable cards meet the 48px minimum touch target.
- Fluid layout without horizontal overflow on mobile screens down to 390px width.

---

## 12. Preserved Core Simulation Invariants

This contract preserves all foundational rules without alteration:
1. **Conception Rate**: Exactly 25% roll on eligible completed Moo-Moo.
2. **Litter Size**: 1–3 kittens, clamped by capacity.
3. **Gestation Duration**: Exactly 3 sim days (72 sim hours / 4,320 sim minutes).
4. **Mutual Readiness (R17)**: Adult life stage, romance score $\ge 75$, positive mood band, mutual consent. Player command cannot force an unwilling partner.
5. **Kinship Guards (Incest Prevention)**:
   - Parent-child and full/half-sibling pairings are strictly forbidden.
   - Ineligible pairing returns `KINSHIP_BLOCKED` and consumes 0 PRNG draws.
6. **Capacity Clamping (R20, R21)**:
   - Max 8 living cats in household.
   - At capacity, Moo-Moo romance continues freely but conception is bypassed with 0 PRNG draws.
7. **Irreversible Loss (R22)**:
   - Death creates a memorial; ghosts never resurrect or reproduce.
   - Pregnancy terminates safely if carrier dies.

---

## 13. Narrow Product Decisions & Integration Summary

| Decision Point | Working Recommendation (Default) | Alternative Policy | Resolution Strategy |
| :--- | :--- | :--- | :--- |
| **Inheritance Odds** | **45% Dam / 45% Sire / 10% Novel** (`weighted_novel`) | **50% Dam / 50% Sire** (`strict_parents`) | Fully parameterized in `InheritanceOddsConfig`. Main coordinator can lock either via config toggle without code changes. |
| **Multi-Actor Cat Care** | **Shared Care** (Both players can direct and care for all 8 cats; reticles indicate who is interacting) | **Segregated Care** (Players can direct only their own 4 cats) | Ownership is strictly tracked per cat (`ownerMemberId`), while action permission defaults to shared family cooperation. |
| **Litter Slot Ownership** | **Dam-Primary with Partner Overflow** (Kitten 1 to Dam owner, Kitten 2 to Sire owner, clamped to 4 slots each) | **Mother-Owned Only** (All kittens to Dam owner; blocked if Dam owner at 4) | Default ensures maximum breeding viability while strictly honoring the 4-cat-per-player ceiling. |

All independent work proceeds immediately under these documented defaults.
