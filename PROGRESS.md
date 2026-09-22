# Cats Collection & Rare Discovery Progress

## Scope
Implement a bounded new Cats collection and rare-discovery domain/content slice in `russellcainiv/cats`.
- Owned file paths:
  - `src/domain/collection/**`
  - `src/content/cats/**`
  - `tests/domain/collection/**`
  - `work/collection/**`
- Broad launch manifest delivered: 42 domestic breed entries (TICA/CFA sourced citations) + coat mix variants, 8 wild types, 8 original fantasy species (58 total).
- Finite deterministic encounter schedule based on active simulated exploration time, explicit domain events (discovery/befriend/recruit), injected pure RNG stream, durable encounter IDs, and replay-safe consumption.
- Per-cat friendship/recruitment progress, revisitable known rare cats when household capacity is full, and atomic recruitment adapter without duplicate/cloning issues.
- Pure typed adapters + `work/collection/INTEGRATION.md` for engine coordinator integration.

## Custody and Boundaries
- Owned paths: `src/domain/collection/`, `src/content/cats/`, `tests/domain/collection/`, `work/collection/`.
- No modification to core engine dispatch/types outside owned paths, root package/config, UI, server, original spec or trackers.
- No `Date.now()`, `Math.random()`, or runtime AI/API calls in game state.

## Implementation Decisions
1. **Catalog Manifest (`src/content/cats/`)**:
   - 42 Domestic Breeds (TICA/CFA sourced with citations) + Coat Pattern Mixes.
   - 8 Wild Cat Species (Caracal, Serval, Eurasian Lynx, Sand Cat, Pallas's Cat, Rusty-Spotted Cat, Snow Leopard, Clouded Leopard).
   - 8 Fantasy Form Species (Moon, Starlight, Cloud, Forest, Crystal, Ember, Aurora, Blossom).
   - Distinguished biological breeds vs coat patterns (tuxedo, calico, tortoiseshell, tabby, etc.) vs fantasy/wild forms.
   - Mapped initial coordinator batch seeds (28 ready) vs missing art keys flagged (`art_needed`).

2. **Rarity & Probability Math (`src/domain/collection/odds.ts`)**:
   - Class rarity weights: Common (70), Uncommon (24), Rare-Domestic (5), Wild (0.75), Fantasy (0.25).
   - Transparent effective probability formula normalized over eligible candidates at encounter time.
   - Wild and Fantasy species strictly lower probability than domestic tiers.

3. **Deterministic Encounter & Recruitment Engine (`src/domain/collection/engine.ts`)**:
   - Active exploration sim minutes trigger schedule checks with 30m cooldown.
   - Injected pure RNG interface `(min, max) => number`.
   - Idempotent friendship increment and atomic recruitment adapter checking household capacity (max 8 living/reserved litter slots across household).
   - Creator and genetic bypass protection (`validateCreatorBreedAllowed`).

4. **Persistence (`src/domain/collection/serializer.ts`)**:
   - Save state serialization and deserialization with deterministic checksums.

## Verified Evidence
- Test suite in `tests/domain/collection/collection.test.ts` (15 tests passing, 0 failing, 492 assertions).
- Screenshot evidence generated at `docs/evidence/collection_tests.png` and visually inspected using `read_image_file`.

## Remaining Integration
- Core engine owner integrates `CollectionDexState` into `WorldState` / `SaveEnvelope` and dispatches collection actions according to `work/collection/INTEGRATION.md`.
- UI owner renders Cat Dex panel, encounter dialogues, and recruitment notifications.

## Next Action
Complete pre-commit checks and submit PR.
