# Economy Subsystem Integration & Contract Document

## 1. Overview
The Economy subsystem (`src/domain/economy/`) owns all economic simulation loops, including:
- **Painting skill & Crafting**: Crafting artwork on easels, skill-based quality tier calculation (basic, fine, masterpiece), easel WIP progress, and single-settlement sales.
- **Gardening**: Seed planting (tomato, strawberry, catnip), growth & watering ticks, yield harvest, and produce inventory sales.
- **Careers & Work Outfits**: Three scheduled tracks (`cafe_assistant`, `garden_keeper`, `gallery_helper`), 3 ranks per track with wage/skill progression, attendance/absence/dismissal, and typed work outfit visibility (`cafe_apron`, `gardener_overalls_sunhat`, `gallery_helper_smock_beret`).
- **Café Business**: Ownable café, recipe restocking, customer order generation, cost/profit ledger, and open/close status.
- **Goals & Rewards**: 18 typed goals across 8 categories, reward claim idempotency, and free-build provenance non-minting invariants.

---

## 2. Shared Engine Extensions

### Local Extension State
The subsystem extends `WorldState.economy.extensions` with:
```ts
export interface EconomyExtensionState {
  workStates: Record<string, CatWorkState>;
  easels: Record<string, EaselState>;
  artworks: Record<string, Artwork>;
  gardenPlots: Record<string, GardenPlotState>;
  cafeDetails: CafeExtensionState;
  claimedGoalRewards: Record<string, boolean>;
}
```

### Outfit Projection Hook
Exposed via `getVisibleOutfit(state: WorldState, catId: string): OutfitProjection`:
```ts
export interface OutfitProjection {
  catId: string;
  isWorking: boolean;
  careerId: CareerId | null;
  outfitId: string | null;
  outfitDetails: OutfitDefinition | null;
}
```

---

## 3. Subsystem Entry Points
Exported from `src/domain/economy/index.ts`:
- `initializeEconomyState(initialEarnedCash?: number)`
- `reduceEconomy(state: WorldState, command: EconomyCommand, context: CommandContext): CommandResult`
- `advanceEconomy(state: WorldState, elapsedSimMinutes: number): WorldState`
- `getVisibleOutfit(state: WorldState, catId: string): OutfitProjection`
- `isEconomyCommand(command: { type: string }): boolean`

---

## 4. Work Outfit Rules & Invariants
1. Cats wear distinct career outfits when departing, working, or returning from work.
2. Saved work state retains outfit visibility during device reloads and mid-shift saves.
3. Upon shift completion, shift cancellation, or job change, the cat's ordinary appearance is restored (`outfitId: null`).
4. Outfit projections are read-only and derived directly from state without mutating underlying coat or accessory attributes.

---

## 5. Verification Commands
Run unit and behavioral invariant tests using Bun or Node:
```bash
bun test tests/domain/economy/economy.test.ts
```
