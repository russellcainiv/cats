# Neighborhood Subsystem Integration Contract

**Module:** `src/domain/neighborhood`  
**Worker / Maintainer:** AGY Gemini 3.8 Flash High (repaired from Jules baseline)  
**Core Reference:** Commit `bdc9c35` at `/Users/russell/.codex/worktrees/cats-engine/Cats`  
**Tickets Covered:** 15 (Travel & Persistent Neighborhood), 16 (Shops & NPC Visits), 25 (Adoption & Neighborhood Transfers)

---

## 1. Exported Entrypoints (`src/domain/neighborhood/index.ts`)

- **`NeighborhoodCommand`**: Union type of all commands handled by the Neighborhood subsystem:
  - `{ type: 'TRAVEL_TO_LOT', payload: { catId: CatId; targetLotId: LotId } }`
  - `{ type: 'CANCEL_TRAVEL', payload: { catId: CatId } }`
  - `{ type: 'RETURN_HOME', payload: { catId: CatId } }`
  - `{ type: 'BUY_SHOP_ITEM', payload: { catalogId: string; quantity: number } }`
  - `{ type: 'ADOPT_CAT', payload: { candidateId?: string; name: string; appearance: CatAppearance; traits: PersonalityTrait[] } }`
  - `{ type: 'TRANSFER_CAT_TO_NEIGHBORHOOD', payload: { catId: CatId; targetLotId: LotId } }`
  - `{ type: 'VISIT_LOT', payload: { catId: CatId; targetLotId: LotId } }`

- **`isNeighborhoodCommand(cmd: { type: string }): cmd is NeighborhoodCommand`**:
  Discriminator function for routing neighborhood commands in core dispatch.

- **`initializeNeighborhoodState(): NeighborhoodSubsystemState`** (also exported as `initializer`):
  Creates initial neighborhood state including 7 persistent lots, 8 NPC cats with schedules, shop catalog, and adoption candidates.

- **`reduceNeighborhood(state: WorldState, command: NeighborhoodCommand, context: CommandContext): CommandResult`**:
  Pure atomic reducer taking full `WorldState` and returning updated `WorldState` or error. Fails closed without mutation or cash changes.

- **`advanceNeighborhood(state: WorldState, elapsedSimMinutes: number): WorldState`**:
  Advance tick handler for active travels, needs decay during journeys, and NPC schedule routines.
  *Engine Clock Invariant:* `advanceNeighborhood` cleanly inspects `state.clock.simMinute` but never increments or mutates it. The central engine simulation loop advances the clock once to end-of-step time.

- **`getHouseholdCapacityUsed(state: WorldState)`**:
  Selector returning `{ livingCount, reservedSlots, reservedLitterSlots, totalUsed }`. Reads canonical `preg.reservedSlots` from `state.lifecycle.pregnancies` (with backwards compatibility for `reservedLitterSlots`).

- **`isCatActivelyPregnant(state: WorldState, catId: CatId, cat: CatRecord)`**:
  Authoritative pregnancy detector inspecting `state.lifecycle.pregnancies` records (matching `cat.pregnancyId`, `parentIds[0]` as gestating parent, or `motherId`), direct `cat.pregnancyId`, or legacy `isPregnant` flag.

---

## 2. World State Schema Requirements (`state.neighborhood` and Cross-Subsystem Contracts)

### Subsystem State Shape:
```ts
export interface NeighborhoodSubsystemState {
  activeLotId: LotId;
  lots: Record<LotId, WorldLot>;
  npcCats: Record<CatId, CatRecord>;
  activeTravels: Record<CatId, TravelJourney>;
  shopInventory: ShopCatalogItem[];
  adoptionCandidates: AdoptionCandidate[];
  transferredCats: Record<CatId, TransferredCatRecord>;
}
```

### Shared Lifecycle Schema Compatibility (`state.lifecycle.pregnancies`):
Canonical core reference defines:
```ts
export interface PregnancyRecord {
  id: PregnancyId;
  parentIds: [CatId, CatId]; // [gestatingCatId, otherParentId]
  startedAtSimMinute: number;
  dueAtSimMinute: number;
  reservedSlots: number;
  conceptionEventId: string;
}
```
`getHouseholdCapacityUsed` and `adoptCat` read `reservedSlots` directly, ensuring households containing pregnant cats never exceed the maximum 8-cat limit (R20).

### Shared CatRecord Compatibility:
`CatRecord` fields aligned across Engine and Neighborhood:
- `careerOutfit?: CareerOutfit | null`
- `baseAppearance?: CatAppearance`
- `isAtWork?: boolean`
- `motherId?: CatId`
- `fatherId?: CatId`
- `familyTree?: { motherId?: CatId; fatherId?: CatId; partnerId?: CatId; offspringIds?: CatId[] }`
- `pregnancyId?: PregnancyId`
- `isPregnant?: boolean`

---

## 3. Seven Persistent Lots & Eight Persistent NPCs

### Lots:
1. `lot_home` — Player Household (20x20)
2. `npc_home_1` — Maple Cottage (16x16, Barnaby & Cleo)
3. `npc_home_2` — Whiskers Manor (18x18, Felix, Milo & Hazel)
4. `npc_home_3` — Cozy Nook (14x14, Luna, Oliver & Shadow)
5. `park` — Sunny Meadow Park (24x24)
6. `shop` — Corner Pet Emporium & Adoption Center (18x18, Open 08:00 - 20:00)
7. `cafe` — Whiskers & Brew Cat Café (18x18, Open 07:00 - 22:00)

### Persistent NPCs & Schedules:
- **Barnaby** (Maple Cottage): park (08:00-12:00), cafe (12:00-16:00), home (16:00-08:00)
- **Cleo** (Maple Cottage): shop (09:00-13:00), park (13:00-17:00), home (17:00-09:00)
- **Felix** (Whiskers Manor): cafe (07:00-11:00), shop (11:00-15:00), home (15:00-07:00)
- **Milo** (Whiskers Manor, Elder): park (10:00-14:00), home (14:00-18:00), cafe (18:00-22:00), home (22:00-10:00)
- **Hazel** (Whiskers Manor): shop (08:00-12:00), park (12:00-17:00), home (17:00-08:00)
- **Luna** (Cozy Nook): cafe (09:00-13:00), park (13:00-18:00), home (18:00-09:00)
- **Oliver** (Cozy Nook, Adolescent): park (08:00-14:00), shop (14:00-19:00), home (19:00-08:00)
- **Shadow** (Cozy Nook): park (10:00-15:00), cafe (15:00-20:00), home (20:00-10:00)

---

## 4. Key Subsystem Rules & Invariants

1. **Travel & Time (Ticket 15, R24)**:
   - Journeys take 10 simulation minutes.
   - Needs decay during travel (hunger -0.08/min, energy -0.06/min, hygiene -0.04/min).
   - `CANCEL_TRAVEL` safely returns cat to origin lot and clears current action.
   - `RETURN_HOME` initiates return journey to `lot_home`.
   - Blocked during closed hours (e.g. shop at 02:00 AM) or invalid destinations.

2. **Numerical Validation in Shop Purchases (Ticket 16, R12, NUM-01)**:
   - Quantity must be a finite positive integer (`Number.isInteger(quantity) && quantity > 0`).
   - Fractional (`1.5`), negative (`-5`), zero, `NaN`, and `Infinity` quantities are strictly rejected.
   - Debits earned cash from `state.economy.wallet`, decrements stock, adds to inventory with `earned` provenance.
   - All failures fail closed without mutating state, wallet, or stock.

3. **Adoption & Capacity Safety (Ticket 25, R20, INT-01)**:
   - Enforces 8 living cats limit: `livingCount + reservedSlots < 8`.
   - Adopting a candidate deducts adoption fee exactly once and removes candidate from `adoptionCandidates` to prevent duplicate adoptions.
   - Supports recovery adoption when living count is 0 (following last cat death), preserving existing home, wallet, memories, and memorials.
   - Generates deterministic collision-free cat IDs.

4. **Adult Cat Move-Out & Transfer (Ticket 25, R20, R24, SAFE-01)**:
   - Only adult living household members may transfer to NPC residential lots (`npc_home_1`, `npc_home_2`, `npc_home_3`).
   - Blocked for kittens and adolescents (`UNSAFE_KITTEN_TRANSFER`).
   - Blocked for pregnant cats (`PREGNANT_TRANSFER_DEFERRED`) detected authoritatively via `cat.pregnancyId` and `state.lifecycle.pregnancies`.
   - Blocked for deceased/ghost cats, non-household cats, wrong household/owner, and duplicate IDs (`DUPLICATE_CAT_ID`).
   - Converts cat to NPC record without deletion, preserving:
     - Stable ID
     - Appearance & baseAppearance
     - Career outfit & rank
     - Ancestry (`motherId`, `fatherId`, `familyTree`)
     - Relationships and traits
     - Logging transfer record in `state.neighborhood.transferredCats`

---

## 5. Composition Guide for Core Engine

In `src/domain/engine.ts` (or central dispatcher):
```ts
import {
  isNeighborhoodCommand,
  reduceNeighborhood,
  advanceNeighborhood,
} from './neighborhood';

export function dispatch(state: WorldState, command: GameCommand, context: CommandContext): CommandResult {
  if (isNeighborhoodCommand(command)) {
    return reduceNeighborhood(state, command, context);
  }
  // ... other subsystems
}

export function advance(state: WorldState, elapsedSimMinutes: number): WorldState {
  let nextState = state;
  nextState = advanceNeighborhood(nextState, elapsedSimMinutes);
  // Central engine simulation advances state.clock.simMinute += elapsedSimMinutes ONCE here.
  return nextState;
}
```

---

## 6. Projection & Presentation Integration Needs for World/UI

1. **Lot Map Navigation**:
   - World renderer should display active lot (`state.neighborhood.activeLotId` or cat position lot).
   - Provide travel selection UI showing 7 lots, their open hours, and resident cats.
2. **Travel Status & Commute Presentation**:
   - When cat is in `state.neighborhood.activeTravels`, UI displays travel progress bar (10 sim minutes).
   - "Cancel Travel" action button triggers `CANCEL_TRAVEL`.
3. **Shop & Adoption Dialogs**:
   - Shop UI displays `state.neighborhood.shopInventory` with prices and remaining stock.
   - Adoption center displays `state.neighborhood.adoptionCandidates` with traits and fees.
4. **NPC Rendering & Transferred Cats**:
   - NPC cats present on the active lot are rendered using their appearance and schedules.
   - Transferred cats remain visible and interactable when visiting their adopted NPC home.
