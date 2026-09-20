# Neighborhood Subsystem Integration Contract

**Module:** `src/domain/neighborhood`  
**Owner:** Jules  
**Tickets Covered:** 15, 16, 25  

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
  Discriminator function for routing commands in core dispatch.

- **`initializeNeighborhoodState(): NeighborhoodSubsystemState`** (also exported as `initializer`):
  Creates initial neighborhood state including 7 persistent lots, 8 NPC cats with schedules, shop catalog, and adoption candidates.

- **`reduceNeighborhood(state: WorldState, command: NeighborhoodCommand, context: CommandContext): CommandResult`**:
  Pure atomic reducer taking full `WorldState` and returning updated `WorldState` or error.

- **`advanceNeighborhood(state: WorldState, elapsedSimMinutes: number): WorldState`**:
  Advance tick handler for active travels, needs decay during journeys, and NPC schedule routines.

---

## 2. World State Schema Extension (`state.neighborhood`)

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

---

## 3. Seven Persistent Lots Included

1. `lot_home` — Player Household (20x20)
2. `npc_home_1` — Maple Cottage (16x16, Barnaby & Cleo)
3. `npc_home_2` — Whiskers Manor (18x18, Felix, Milo & Hazel)
4. `npc_home_3` — Cozy Nook (14x14, Luna, Oliver & Shadow)
5. `park` — Sunny Meadow Park (24x24)
6. `shop` — Corner Pet Emporium & Adoption Center (18x18, Open 08:00 - 20:00)
7. `cafe` — Whiskers & Brew Cat Café (18x18, Open 07:00 - 22:00)

---

## 4. Key Subsystem Rules & Invariants

1. **Travel & Time**: Journeys take 10 simulation minutes. Needs decay during travel. Cancel returns cat to origin. Blocked on closed lot hours or invalid IDs.
2. **Shop Transactions**: Debits earned cash from `state.economy.wallet`, reduces stock, adds to inventory with `earned` provenance.
3. **Adoption & Capacity**: Enforces 8 living household cats limit, counting living cats + reserved litter slots (`state.lifecycle.pregnancies`). Supports recovery adoption when living count is 0 (after last-cat death).
4. **Cat Transfer**: Adult household cats can transfer to NPC residential lots without deletion. Preserves stable Cat ID, traits, relationships, and history. Blocks kittens, adolescents, pregnant cats, and deceased/ghost cats.

---

## 5. Composition Guide for Core Engine

In `src/domain/engine.ts`:
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
  // ... handle other commands
}

export function advance(state: WorldState, elapsedSimMinutes: number): WorldState {
  let nextState = state;
  nextState = advanceNeighborhood(nextState, elapsedSimMinutes);
  // ... advance other subsystems
  return nextState;
}
```
