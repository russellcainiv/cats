# Collection & Rare Discovery Slice Integration Guide

**Owned Domain Path:** `src/domain/collection/**`
**Owned Content Path:** `src/content/cats/**`
**Owned Test Path:** `tests/domain/collection/**`
**Owned Work Path:** `work/collection/**`

---

## 1. Overview & Export Summary

This slice delivers the feline catalog manifest, Cat Dex tracking, deterministic exploration encounter scheduler, friendship mechanics, and atomic household recruitment adapter for rare/domestic cats.

### Core Exports from `src/domain/collection/index.ts`:

- `checkExplorationSchedule(state, context, rng)`: Evaluates active exploration minutes and deterministically rolls an encounter from eligible candidates using pure injected RNG.
- `befriendEncounter(state, encounterId, points, simMinute)`: Increments friendship points for a known encounter.
- `recruitEncounterAdapter(state, encounterId, actorId, householdAdapter, simMinute)`: Atomically checks friendship and household capacity (8 living/reserved limit across Mother and Daughter), marking the encounter recruited and returning the canonical new cat ID.
- `validateCreatorBreedAllowed(catalogId)`: Ensures wild and fantasy forms cannot be created in the Cat Creator or spawned via ordinary genetic novelty.
- `serializeCollectionState(state)` / `deserializeCollectionState(data)`: Handles save serialization with checksums.

### Core Exports from `src/content/cats/index.ts`:

- `ALL_CAT_CATALOG`: Array of 58 felines (42 domestic breed entries + coat mixes, 8 wild species, 8 original fantasy species).
- `getCatalogSummary()`: Provides manifest statistics (42 domestic, 8 wild, 8 fantasy, 28 batch seed ready, 30 art needed).
- `findCatalogEntry(id)`: Looks up catalog metadata by stable ID.

---

## 2. Rarity Weights & Effective Odds

The encounter engine uses class-level rarity weights normalized over eligible candidates at encounter time:

| Rarity Class | Class Weight | Relative Encounter Frequency |
| :--- | :--- | :--- |
| Common Domestic | 70 | High |
| Uncommon Domestic | 24 | Medium |
| Rare Domestic | 5 | Low |
| Wild Species | 0.75 | Extremely Rare |
| Fantasy Species | 0.25 | Ultra Rare |

### Effective Probability Formula
$$\text{Effective Weight Summary} = \sum_{\text{tier } t \in \text{eligible}} \text{Weight}(t)$$
$$\text{Effective \% for Tier } t = \frac{\text{Weight}(t)}{\text{Effective Weight Summary}} \times 100\%$$

*Note:* Wild and Fantasy species are always lower encounter probability than any domestic tier. They are never spawned as a 10% genetic wildcard outcome.

---

## 3. Engine Composition Instructions for Reducer / Dispatcher

The engine coordinator should embed `CollectionDexState` inside the primary `WorldState` / `SaveEnvelope`:

```ts
// SaveEnvelope extension:
export interface WorldState {
  // ... existing household state ...
  dexState: CollectionDexState;
}
```

### Action Dispatch Mapping:
1. `CHECK_EXPLORATION_SCHEDULE`: Pass `simMinute`, `locationId`, `timeOfDay`, `weatherCondition`, and injected deterministic RNG function.
2. `BEFRIEND_ENCOUNTER`: Pass `encounterId` and `friendshipPoints`.
3. `RECRUIT_ENCOUNTER`: Supply `actorId` and `HouseholdCapacityAdapter` containing current living cat count and reserved litter slots. The reducer must execute this within its single-threaded serialization boundary to prevent concurrent double-recruitment.

---

## 4. Caller Preconditions & Concurrency Guarantees

- **No Non-Deterministic Calls:** Caller MUST supply canonical `simMinute`, `actorId`, and pure `InjectedRNG`. Do not pass `Date.now()` or `Math.random()`.
- **Concurrency Serialization:** The adapter guarantees that given serialized execution, an encounter cannot be recruited twice. `recruitEncounterAdapter` checks `encounter.recruited` and rejects secondary attempts with an explicit error message.
- **Capacity & Revisit Support:** When household capacity is full (8/8), wild and fantasy cats can still be encountered, befriended, and added to the Cat Dex. They remain at their known lot location for revisits without forced eviction or forced adoption.
