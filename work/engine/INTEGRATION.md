# Canonical Cats Game Engine Integration & Architecture Specification

**Status**: Verified & Integrated (100% Domain Test Suite Passing: 147 tests across 24 files; Strict TypeScript Clean)  
**Target Worktree**: `/Users/russell/.codex/worktrees/cats-engine/Cats`  
**Base Commits Integrated**:  
- Social: `6983dec`  
- Lifecycle: `fb4fc2d`  
- Economy: `6e3ac14`  
- Neighborhood: `22606f9`  
- Building: `1ff7b0b` + Cherry-picked repair `4b815aa` (`f1831a6`)  

---

## 1. Architecture Overview & Core Pipeline

The Cats Engine is a pure, deterministic, typed life-simulation domain engine written in TypeScript. It maintains strict immutability across all state transitions and operates through two authoritative pipelines:

1. **Atomic Command Dispatch (`dispatch`)**:
   ```typescript
   dispatch(state: WorldState, command: GameCommand, context: CommandContext): CommandResult
   ```
   - **Idempotency**: All commands are validated against `state.commandReceipts` using SHA-256 canonicalized JSON hashing (keys sorted deterministically). Duplicate successful commands return `{ ok: true, state, events: [] }` without side effects or duplicate receipts. Mismatched payload reuse returns `{ ok: false, error: { code: 'COMMAND_ID_PAYLOAD_MISMATCH' } }`.
   - **Household Capacity**: Enforces the strict invariant of maximum 8 cats (`livingCatIds.length + reservedPregnancySlots <= 8`) across adoption, cat creation, adult neighborhood transfers, and conception.
   - **Subsystem Routing**: Dispatches to core handlers or typed subsystem reducers (`reduceBuilding`, `reduceSocial`, `reduceEconomy`, `reduceNeighborhood`, `reduceLifecycle`).
   - **Invariants**: Every state update is validated with structured error codes (`assertInvariants`).

2. **Simulation Advancement (`advance`)**:
   ```typescript
   advance(state: WorldState, elapsedSimMinutes: number): WorldState
   ```
   - **Authoritative Clock**: Steps exactly 1 minute at a time (`stepSingleMinute`) to preserve complete segmentation invariance (`advance(60) === 60 * advance(1)`).
   - **Clock Invariant**: Non-finite or negative `elapsedSimMinutes` are safely guarded and clamped without corrupting `simMinute`.
   - **Pause Guard**: When `state.clock.isPaused === true`, time does not advance and simulation returns the input state unchanged.
   - **Deterministic RNG**: Single canonical RNG stream (`SeededRng` / PCG32/SplitMix64) stepped authoritatively; zero unseeded `Math.random()` or `Date.now()` entity ID generation across all subsystems.

---

## 2. Integrated Subsystems

### 2.1 Building Subsystem (`src/domain/building/`)
- **30 Catalog Items**: Seating, beds, litter boxes, scratch posts, toys, feeding stations, decor.
- **Geometry & Collision**: Discrete grid coordinate space, footprint checks, wall edge checks, wall-on-cat collision guards.
- **Wall & Apertures**: Placement and removal of walls, doors, and windows, automatically updating `lot.blockedCells` and door-wall alignment.
- **Finishes & Demolition**: Floor and wall finish segments; bounded room demolition with full refund calculation.
- **Reachability Validation**: Pathfinding validation (`validateLotReachability`) ensuring no cat is trapped in an inaccessible room without a door.
- **Atomic Undo/Redo & Wallet Sync**: Snapshot stack storing `{ lot, wallet }` atomically. Undoing a purchase restores funds; redoing re-deducts funds. Capped at 30 entries. Invalidated when simulation advances a tick.
- **Free-Build Mode**: Supports `$0` placement with `free_build` provenance tracking. Demolition or selling of free-built objects awards `$0` refund, preventing money minting exploits.

### 2.2 Social Subsystem (`src/domain/social/`)
- **Relationships**: Tracked bidirectionally with `friendship` (-100 to 100), `romance` (0 to 100), `isLove`, `isFriend`, and `isRival`.
- **Interactions**: Autonomous and directed interactions (`sniff`, `nuzzle`, `play_chase`, `hiss`, `groom_other`, `share_treat`).
- **Moo-Moo Romance & Conception**:
  - Requires mutual romance (≥50), love status, adult stage, same lot, no kinship clash, and available household capacity (`< 8`).
  - Initiates 10-minute in-progress social action (`moo_moo`).
  - Parity between autonomous and player-directed execution: sets needs satisfaction (`social: 100`, `energy` drain), timestamps, and relationship increases.
  - Generates authoritative `PregnancyRecord` in `state.lifecycle.pregnancies` on the dam, reserving slots (1–3 kittens).
  - Double conception guard: dams already pregnant cannot conceive simultaneous litters.

### 2.3 Economy Subsystem (`src/domain/economy/`)
- **3 Careers (3 Ranks Each)**:
  - `cafe_assistant`: Ranks 1-3 (`outfit_cafe_apron_green`, `outfit_cafe_barista_black`, `outfit_cafe_manager_gold`).
  - `garden_keeper`: Ranks 1-3 (`outfit_garden_strawhat`, `outfit_garden_overalls`, `outfit_garden_master`).
  - `gallery_helper`: Ranks 1-3 (`outfit_gallery_beret`, `outfit_gallery_smock`, `outfit_gallery_curator`).
- **Outfit Swapping & Restoration**:
  - Cats automatically put on career outfits and accessory IDs upon shift departure (`isAtWork: true`).
  - Original base appearance is preserved and restored upon shift completion, job change, or shift cancellation.
  - Shift return atomically awards daily wages (`hoursWorked * hourlyWage`).
- **Hobbies & Business**:
  - Gardening: 3 crops (`tomato`, `strawberry`, `catnip`) with growth cycles and harvest payouts.
  - Painting: Canvas easel hobby with skill progression and sellable artwork.
  - Cafe Business: Recipe restocking (`espresso`, `matcha_latte`, `catnip_tea`), supplies tracking, and daily customer revenue.
- **18 Goal Evaluators**: Real evaluators across care, relationships, building, career, hobbies, cafe, neighborhood, and legacy.

### 2.4 Neighborhood Subsystem (`src/domain/neighborhood/`)
- **7 Persistent Lots**: `home`, `park`, `cafe`, `market`, `shelter`, `town_square`, `community_garden`.
- **8 Persistent NPCs**: Pre-populated with rich personalities, traits, appearances, and relationship tables.
- **Travel & Visits**: Instant and routed transitions between lots with position updates.
- **Adoption**: Shelter adoption deducting exact-once adoption fee ($100), creating canonical cat record, and safely populating empty households.
- **Adult Transfers**: Transferring adult cats between households while preserving family ancestry, relationships, and career records. Blocks kittens, adolescents, pregnant cats, and deceased cats.

### 2.5 Lifecycle Subsystem (`src/domain/lifecycle/`)
- **Authoritative Pregnancy & Gestation**:
  - 3 Sim Days (4320 simulation minutes) duration.
  - Due date evaluation: `TRIGGER_BIRTH` strictly guarded at domain boundary against premature execution.
- **Genetics Inheritance**:
  - Kittens inherit breed, body type, primary/secondary color, pattern, eye color, and base appearance from parents via deterministic Mendelian/blending rules.
- **Life Stages & Aging**:
  - 4 stages: `kitten` (0-3 days), `adolescent` (3-7 days), `adult` (7-60 days), `elder` (60+ days).
  - Elder natural mortality: upon reaching maximum lifespan, cat transitions to `lifeStatus: 'deceased'`, freeing living household capacity.
- **Memorials & Ghosts**:
  - Memorials (`MemorialRecord`) placed on lot storing tombstone coordinates, cause of death, and deceased cat portrait.
  - Nighttime ghost visits (22:00–04:00) spawning glowing semi-transparent `GhostProjection` entities that interact peacefully with living cats.

---

## 3. GameView Projection Contract (`src/domain/selectors.ts`)

The presentation layer (`cats-world`) consumes pure read-only projections via `selectView(world: WorldState): GameView`:

```typescript
export interface GameView {
  household: {
    id: HouseholdId;
    name: string;
    livingCount: number;
    reservedLitterSlots: number;
    capacity: 8;
    mode: 'normal' | 'free-build-preview' | 'free-build-committed';
  };
  simulation: {
    isPaused: boolean;
    simMinute: number;
    day: number;
    hour: number;
    minute: number;
    statusText: string;
  };
  selectedCatId: CatId | null;
  selectedCat: CatView | null;
  cats: Record<CatId, CatView>;
  home: LotView;
  currentLot: LotView;
  wallet: Wallet;
  inventory: InventoryItem[];
  careers: CareerRecord[];
  goals: GoalRecord[];
  memorials: MemorialRecord[];
  ghosts: GhostProjection[];
  warnings: WarningItem[];
}
```

### Truthful Projection Invariants
1. **Zero Mock Shortcuts**: All collections (`careers`, `memorials`, `ghosts`, `warnings`, `goals`) are projected directly from live domain state.
2. **Cat Presentation Fidelity**: `CatView` exposes `motherId`, `fatherId`, `pregnancyId`, `careerOutfit`, `isAtWork`, 7 needs (0-100), mood score and mood band (`miserable` | `low` | `okay` | `happy` | `ecstatic`).
3. **Lot Rendering**: `LotView` exposes full 2D grid dimensions, blocked cells, walls, doors, and objects with interact spots.

---

## 4. Review Findings & Observations Resolved

| Defect / Observation | Severity | Root Cause | Resolution |
| :--- | :--- | :--- | :--- |
| **CORE-R2-01** | High | `advance(NaN)` corrupted clock `simMinute` | Added finite positive integer guard; non-finite elapsed minutes return unchanged state. |
| **CORE-R2-02** | High | Autonomous Moo-Moo mutated partner cat in-place | Replaced in-place object mutation with pure immutable object spread updates. |
| **CORE-R2-03** | High | Unstable JSON key ordering in idempotency hashing caused false duplicate rejections | Implemented `canonicalizeJson` sorting keys recursively prior to SHA-256 hashing. |
| **CORE-R2-04** | Med | Invariant check threw generic errors without codes | Wrapped violations in structured `DomainInvariantError` with typed code `INVARIANT_VIOLATION`. |
| **CORE-R2-05** | Med | Discrepancy between directed and autonomous Moo-Moo need effects | Unified need satisfaction (`social: 100`, energy drain) and interaction timestamp updates across both. |
| **OBS-01** | Med | Kitten appearance inheritance used legacy fallback defaults | Genetics engine now deterministically inherits `breed`, `bodyType`, `primaryColor`, `pattern`, `eyeColor`, and `baseAppearance`. |
| **OBS-02** | Med | `TRIGGER_BIRTH` allowed premature birth before due date | Guard added rejecting `TRIGGER_BIRTH` if `simMinute < pregnancy.dueAtSimMinute`. |
| **OBS-03** | Med | Legacy `family` fields caused kinship confusion | Canonical kinship uses `motherId`/`fatherId` with bidirectional migration compatibility. |
| **OBS-04** | Low | Subsystems used diverging RNG default seeds | Unified all RNG instances to single default seed `1337`. |

---

## 5. Integration Verification Matrix

```
Test Files: 24 passed (147 tests total)
Strict TypeScript: 0 errors (tsc --noEmit --strict)
Runtime: Bun v1.3.14
Deterministic Invariance:
  - advance(60) === 60 * advance(1) (VERIFIED)
  - Pure Immutability: input states never mutated in place (VERIFIED)
  - Round-trip JSON Serialization: state survives deep stringify/parse (VERIFIED)
  - 8-Cat Limit: strictly enforced across adoption, birth, transfer (VERIFIED)
```
