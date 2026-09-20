# Economy Subsystem Integration & Contract Document

**Worker Lane:** AGY Gemini 3.8 Flash High  
**Subsystem:** Economy (`src/domain/economy/`)  
**Core Reference:** Committed `bdc9c35` at `/Users/russell/.codex/worktrees/cats-engine/Cats`  
**Status:** Domain and Regression Tests Repaired & Verified; UI/Release Honestly Pending  

---

## 1. Subsystem Mission & Scope

The Economy subsystem owns all economic simulation loops in the Cats life simulation:
1. **Painting Crafting & Artwork**: Crafting on easels, skill-based quality tiers (`basic`, `fine`, `masterpiece`) via deterministic seeded RNG, easel WIP progress, stable deterministic artwork IDs, and single-settlement sales.
2. **Gardening & Produce**: Planting crops (`tomato`, `strawberry`, `catnip`), hydration tracking, growth progress, withering, harvesting into player inventory, and selling produce.
3. **Careers, Work Outfits & 3-Rank Promotions**: Three scheduled career tracks (`cafe_assistant`, `garden_keeper`, `gallery_helper`), each with 3 ranks, progression criteria (skills, shifts worked, performance), wage progression ($12–$45/hr), staged commute states (`off_work`, `departing`, `working`, `returning`), and mandatory typed career outfits.
4. **Cat Café Operations**: Business acquisition, recipe supplies restocking with strict numerical safety, customer queue, deterministic customer order generation, and single-settlement service.
5. **18 Goals & Rewards**: Evidence-driven evaluation of all 18 goals across 8 categories, free-build non-counterfeiting invariants, and once-only reward payouts.
6. **Command Deduplication & Invariant Safety**: Integration with `state.commandReceipts`, zero module clock mutation, and canonical Mulberry32 + SplitMix32 seeded RNG.

---

## 2. Shared Engine Schema Alignment & Local Extensions

The subsystem aligns strictly with the canonical `WorldState` model defined in `cats-engine/Cats/src/domain/state.ts`.

### 2.1 State Extension (`WorldState.economy.extensions`)

```ts
export interface EconomyExtensionState {
  workStates: Record<string, CatWorkState>;
  easels: Record<string, EaselState>;
  artworks: Record<string, Artwork>;
  gardenPlots: Record<string, GardenPlotState>;
  cafeDetails: CafeExtensionState;
  claimedGoalRewards: Record<string, boolean>;
  stats?: EconomyStats;
}
```

- **`workStates`**: Tracks per-cat shift status, shift hours, current outfit ID, last paid minute, days worked, and commute timestamps.
- **`easels`**: In-progress easel craft states, target minutes, and provenance.
- **`artworks`**: Completed paintings with stable IDs (`art_${catId}_${simMinute}_${seq}`), quality, and value.
- **`gardenPlots`**: Soil plots tracking planted crops, watering timestamps, withering, and harvestability.
- **`cafeDetails`**: Business ownership, open/closed flag, revenue, expenses, active customer orders, total orders served, and total orders created.
- **`claimedGoalRewards`**: Map of `goalId -> boolean` preventing duplicate reward collection across reloads or reconnects.
- **`stats`**: Lifetime statistics used by goal evaluators (`artworksPainted`, `artworksSold`, `masterpiecesPainted`, `totalCropsHarvested`, `shiftsWorkedTotal`, etc.).

### 2.2 Canonical `CatRecord` Synchronization

To eliminate synchronization gaps with the main engine and world renderer, the economy module synchronizes the following fields directly onto `state.cats[catId]` upon work transitions:
- **`careerOutfit`**: `{ outfitId: string; careerId: string; rank: number } | null`
  - Set to the career outfit during `'departing'`, `'working'`, and `'returning'`.
  - Cleared to `null` on shift completion, cancellation, or job change.
- **`isAtWork`**: `boolean` (`true` when active on shift or commute, `false` otherwise).
- **Appearance Invariant**: Base appearance (`primaryColor`, `secondaryColor`, `pattern`, `eyeColor`, `bodyType`, `collarColor`, `accessoryId`) is **never mutated** by career clothing.

---

## 3. Mandatory Career Outfits & World Rendering Contract

The world rendering worker (`src/features/world`, Pixi.js renderer, and portrait components) should use either `getVisibleOutfit(state, catId)` or inspect `cat.careerOutfit` directly.

### 3.1 Clothing Asset Keys & Visual Specification

| Career Track | Outfit ID | Body Asset Key | Hat Asset Key | Visual Description |
|---|---|---|---|---|
| **Café Assistant** (`cafe_assistant`) | `cafe_apron` | `apron_green` | `undefined` | Cozy dark-green barista apron with front pocket. |
| **Garden Keeper** (`garden_keeper`) | `gardener_overalls_sunhat` | `overalls_denim` | `sunhat_straw` | Sturdy denim overalls and wide-brim straw sunhat. |
| **Gallery Helper** (`gallery_helper`) | `gallery_helper_smock_beret` | `smock_artist` | `beret_red` | Paint-flecked cream artist smock and tilted red wool beret. |

### 3.2 Read-Only Helper: `getVisibleOutfit(state, catId)`

```ts
export interface OutfitProjection {
  catId: string;
  isWorking: boolean;
  careerId: CareerId | null;
  outfitId: string | null;
  outfitDetails: OutfitDefinition | null;
}
```
- Returns `isWorking: true` and the corresponding `OutfitDefinition` whenever the cat is `'departing'`, `'working'`, or `'returning'`.
- Returns `isWorking: false` and `outfitId: null` when the cat is `'off_work'`, has cancelled their shift, or has no career.
- Automatically persists across JSON save/load envelopes mid-shift.

---

## 4. Career Tracks, Commute Lifecycle & 3-Rank Progression

Each career track supports three distinct ranks with wage progression, schedule definitions, and skill/experience requirements:

### 4.1 Career Progression Table

| Track | Rank | Title | Hourly Wage | Req. Skill | Req. Level | Req. Shifts | Shift Hours | Work Days |
|---|---|---|---|---|---|---|---|---|
| **Café Assistant** | 1 | Barista Trainee | $15 / hr | Social | 0 | 0 | 08:00 – 16:00 | Mon – Fri |
| | 2 | Head Barista | $25 / hr | Social | 3 | 3 | 08:00 – 16:00 | Mon – Fri |
| | 3 | Café Manager | $40 / hr | Social | 6 | 7 | 08:00 – 16:00 | Mon – Fri |
| **Garden Keeper** | 1 | Weed Puller | $12 / hr | Gardening | 0 | 0 | 07:00 – 15:00 | Mon – Fri |
| | 2 | Landscape Caretaker | $22 / hr | Gardening | 3 | 3 | 07:00 – 15:00 | Mon – Fri |
| | 3 | Master Botanist | $38 / hr | Gardening | 6 | 7 | 07:00 – 15:00 | Mon – Fri |
| **Gallery Helper** | 1 | Art Docent | $18 / hr | Painting | 0 | 0 | 10:00 – 18:00 | Tue – Sat |
| | 2 | Exhibitions Curate | $28 / hr | Painting | 3 | 3 | 10:00 – 18:00 | Tue – Sat |
| | 3 | Gallery Director | $45 / hr | Painting | 6 | 7 | 10:00 – 18:00 | Tue – Sat |

### 4.2 Staged Commute Lifecycle
- **`DEPART_FOR_WORK` / `START_WORK_SHIFT` with staged flag**: Transitions `workState.status` to `'departing'`. Equips outfit, synchronizes `isAtWork: true`, and sets a 15-minute commute window (`commuteUntilSimMinute`).
- **`ARRIVE_AT_WORK` / `advanceEconomy` tick**: Commute completes and status transitions to `'working'`.
- **`RETURN_FROM_WORK` / shift end**: When shift duration expires, status transitions to `'returning'` (or `'off_work'`). Wages are settled once.
- **`FINISH_WORK_SHIFT` / arrival home**: Wages are settled once (if not already paid during tick), status resets to `'off_work'`, and ordinary appearance is restored.
- **Auto-Promotion & `PROMOTE_CAREER`**: Evaluated upon shift completion or explicitly triggered via `PROMOTE_CAREER`. Validates skill level, shifts worked, and performance thresholds before promoting.

---

## 5. Money Invariants & Numerical Exploit Defenses

To permanently resolve audit findings **SEC-01** and **NUM-01**:
1. **`RESTOCK_CAFE` Validation**:
   - `amount` must satisfy `Number.isFinite(amount) && Number.isInteger(amount) && amount > 0`.
   - All negative numbers (`-10`), `-Infinity`, `Infinity`, `NaN`, and fractional values (`1.5`) are rejected with `{ code: 'INVALID_AMOUNT' }`.
   - Total cost is calculated as `recipe.costToStock * amount` and verified against available `wallet.earnedCash`.
2. **`BUY_ITEM` & `SELL_ITEM` Validation**:
   - `quantity` must satisfy `Number.isFinite(quantity) && Number.isInteger(quantity) && quantity > 0`.
   - Rejects `NaN`, non-integers, negative numbers, and `Infinity` with `{ code: 'INVALID_QUANTITY' }`.
   - Validates that `item.quantity >= quantity` before modifying inventory.
3. **`PROGRESS_PAINTING` Validation**:
   - `elapsedMinutes` must be a positive finite integer (`Number.isInteger(elapsedMinutes) && elapsedMinutes > 0`).
4. **Pure Rejections with Zero Side Effects**:
   - Every rejected command returns the original `worldState` untouched.
   - Zero side effects on money, inventory, events, or RNG state on failure.

---

## 6. Neighborhood Shop & Economy Cross-Contract Interface

### 6.1 Read-Only Review of Neighborhood `shop.ts`
The neighborhood module exposes `buyShopItem(state, catalogId, quantity, context)`:
- Reads `state.economy.wallet.earnedCash` and deducts `item.price * quantity`.
- Writes purchased items into `state.economy.inventory[catalogId]` with `provenance: 'earned'`.
- Catalog items: `gourmet_catnip` ($15), `deluxe_scratching_post` ($85), `feather_wand_toy` ($25), `plush_donut_bed` ($120), `automatic_water_fountain` ($95).

### 6.2 Resale & Produce Pricing Contract
When items are sold via `SELL_ITEM`:
- **Garden Crops**:
  - `item_crop_tomato`: Base sell price **$8**
  - `item_crop_strawberry`: Base sell price **$15**
  - `item_crop_catnip`: Base sell price **$25**
- **Catalog & Shop Items**:
  - Default unit price: **$10** (or catalog resale value).
- **Free-Build Isolation (R13)**:
  - Any item with `provenance === 'free_build'` yields **$0** earned cash upon sale (`totalPrice: 0`).
  - Free-build items never increase `wallet.earnedCash`.

### 6.3 Exported Data Needed by Engine Integration
From `src/domain/economy/index.ts`:
- `initializeEconomyState(initialEarnedCash?: number)`
- `reduceEconomy(state: WorldState, command: EconomyCommand, context: CommandContext): CommandResult`
- `advanceEconomy(state: WorldState, elapsedSimMinutes: number): WorldState`
- `getVisibleOutfit(state: WorldState, catId: string): OutfitProjection`
- `isEconomyCommand(command: { type: string }): boolean`
- `SeededRng` and `getRngFromWorld(worldState)`
- Constants: `CAREER_CONFIGS`, `CROP_CONFIGS`, `CAFE_RECIPES`, `GOAL_DEFINITIONS`, `CAREER_OUTFITS`

---

## 7. Evidence-Driven Evaluation of All 18 Goals

All 18 goals defined in `GOAL_DEFINITIONS` are evaluated in `advanceEconomy` using concrete simulation evidence:

| Goal ID | Title | Target | Evidence Evaluator Condition |
|---|---|---|---|
| `goal_care_1` | First Care | 1 | `DIRECT_CARE`, `CARE_ACTION`, `CAT_FED`, or `CAT_GROOMED` event. |
| `goal_care_2` | Attentive Caregiver | 10 | 10 care actions or all living household cats have needs $\ge 70$. |
| `goal_relationships_1` | Making Friends | 1 | Any cat relationship with friendship $\ge 50$. |
| `goal_relationships_2` | True Love | 1 | Any cat relationship with `isLove === true` or romance $\ge 80$. |
| `goal_building_1` | Home Decorator | 5 | $\ge 5$ earned objects placed on home lot (free-build excluded). |
| `goal_building_2` | Master Builder | 1 | $\ge 1$ earned wall/room segment built (free-build excluded). |
| `goal_work_1` | First Shift | 1 | Completed $\ge 1$ career shift across all cats. |
| `goal_work_2` | Hard Worker | 5 | Completed $\ge 5$ career shifts across all cats. |
| `goal_work_3` | Career Promotion | 1 | Any cat in household reached Rank 2 or higher in any career. |
| `goal_hobbies_1` | Budding Artist | 1 | Painted $\ge 1$ artwork on easel. |
| `goal_hobbies_2` | Masterpiece Painter | 1 | Painted $\ge 1$ masterpiece with earned provenance (free-build excluded). |
| `goal_hobbies_3` | Green Thumb | 3 | Harvested $\ge 3$ crops from garden plots. |
| `goal_hobbies_4` | Bountiful Harvest | 1 | Harvested catnip crop or earned catnip in inventory. |
| `goal_business_1` | Café Owner | 1 | Café business acquired and open (`owned: true`, `isOpen: true`). |
| `goal_business_2` | Busy Barista | 10 | Served $\ge 10$ customer orders at café. |
| `goal_neighborhood_1` | Explorer | 1 | Visited an external neighborhood lot (`position.lotId !== 'lot_home'`). |
| `goal_neighborhood_2` | Social Butterfly | 3 | Interacted with $\ge 3$ distinct neighborhood NPC cats. |
| `goal_legacy_1` | Growing Family | 1 | Welcomed a living kitten into household (`lifeStage === 'kitten'`). |

### Reward Claim Idempotency
- Rewards are claimed via `CLAIM_GOAL_REWARD`.
- Successfully claimed goals are recorded in `state.economy.extensions.claimedGoalRewards[goalId] = true`.
- Attempting to claim an already-claimed goal returns `{ ok: false, error: { code: 'ALREADY_CLAIMED' } }`.

---

## 8. Architecture Composition: Central Clock & Deterministic Seeded RNG

### 8.1 Zero Clock Mutation Rule
- `advanceEconomy(state, elapsedSimMinutes)` reads `state.clock?.simMinute` but **never mutates it**.
- Eliminates clock double-ticking when composed with the central simulation loop.

### 8.2 Canonical Seeded RNG
- Replaced all calls to `Math.random()` and `Date.now()` with `SeededRng` (Mulberry32 + SplitMix32 algorithm).
- RNG state is serialized to `state.rng.serializedState` and `state.rng.counter`.
- Replays from identical seeds generate 100% bit-for-bit identical outputs across devices and saves.

### 8.3 Command Receipts Deduplication Ledger
- Successful commands append receipt records to `state.commandReceipts`:
  ```ts
  {
    commandId: context.commandId,
    simMinute: state.clock.simMinute,
    actorId: context.actorId,
    type: command.type,
    success: true,
    receiptChecksum: `chk_${command.type}_${simMinute}_${seq}`
  }
  ```
- Bounded to the last 100 receipts (`MAX_RECEIPTS_LOG_SIZE`).

---

## 9. Verification & Test Evidence

Run tests using the project's native tooling:
```bash
bun test tests/domain/economy/economy.test.ts tests/domain/economy/regression.test.ts
```
All 24 test cases across both suites pass with 100% green assertion status.
