# Building Subsystem Progress (`work/building/PROGRESS.md`)

## Status Overview
- **Lanes Owned**: `src/domain/building/**`, `tests/domain/building/**`, `work/building/**`
- **Tasks**: Tasks 07-10 (Issues 08-11), Task 27 (Furnishings & Content)
- **Status**: **REPAIRS COMPLETE - READY FOR CANONICAL INTEGRATION**

---

## Review Remediation Evidence

All substantiated findings from independent review (`work/reviews/building/REVIEW.md`, score 68/100) have been fully resolved:

1. **DEF-BUILD-01 (Atomic Undo/Redo Wallet Synchronization)**:
   - `UndoRedoEntry` now captures `{ lot: WorldLot; wallet: Wallet }`.
   - Undoing `BUY_AND_PLACE_OBJECT` restores spent funds back to the player wallet.
   - Undoing `SELL_OBJECT` debits refunded cash and restores object, completely eliminating the infinite money duplication exploit.
   - Repeated multi-step editing sequences maintain exact balance and geometry invariants.

2. **DEF-BUILD-02 (Deterministic ID & Checksum Generation)**:
   - Eliminated all calls to `Date.now()` and `Math.random()`.
   - Entity IDs (`obj_*`, `wall_*`, `door_*`, `win_*`, `flr_*`) are deterministically generated using `state.nextEventSequence`, catalog IDs, and coordinates.
   - Command receipt checksums use a deterministic 32-bit polynomial hash of the payload matching core idempotency rules.

3. **DEF-BUILD-03 (Coordinate Sanitization & NaN Immunity)**:
   - All spatial commands (`BUILD_WALL`, `PLACE_DOOR`, `PLACE_WINDOW`, `SET_FLOOR_FINISH`, `BUY_AND_PLACE_OBJECT`, `MOVE_OBJECT`, `DEMOLISH_ROOM`) enforce finite integer coordinates within lot bounds.
   - Non-finite (`NaN`, `Infinity`), non-integer, or diagonal wall coordinates are rejected with `INVALID_COORDINATES` or `OUT_OF_BOUNDS`, leaving the wallet and lot untouched.
   - `advanceBuilding` safely ignores non-finite, negative, or zero minutes without corrupting `clock.simMinute`.

4. **DEF-BUILD-04 (Attached-Wall and Door/Window Rules)**:
   - `PLACE_DOOR` and `PLACE_WINDOW` verify `isEdgeOnWall` and reject floating placement with `MISSING_WALL`.
   - Coincident placement on the same wall edge is rejected with `COLLISION`.
   - Removing a wall (`REMOVE_WALL`) automatically cleans up attached doors and windows so entities are never left floating.

5. **DEF-BUILD-05 (Wall-on-Cat Collision Rejection)**:
   - `BUILD_WALL` checks `isCatIntersectingWall` for every cat on the target lot.
   - Walls slicing horizontally or vertically directly through a cat's cell coordinates are rejected with `INVALID_LAYOUT`.

6. **DEF-BUILD-06 (Out-of-Bounds Interaction Anchor Rejection)**:
   - `validateLotReachability` verifies that every transformed interaction anchor is within lot bounds (`isCellWithinLot`). Placements that push anchors outside the lot boundary are rejected with `INVALID_LAYOUT`.

7. **DEF-BUILD-07 (Demolition Orphan Cleanup)**:
   - `DEMOLISH_ROOM` filters and deletes all entities within the bounded box: walls, objects, doors, windows, and floor finishes.
   - Earned doors ($50), windows ($40), and floor finishes ($10/tile area) are refunded atomically.
   - Any doors/windows left unsupported by demolished walls are cleaned up.

8. **DEF-BUILD-08 (Construction Tools & Itemized Costs)**:
   - Itemized costs are implemented for all construction tools: walls ($20/tile length), doors ($50), windows ($40), floor finishes ($10/tile area), wall finishes ($15/wall).
   - Insufficient funds abort atomically without debit.

9. **DEF-BUILD-09 (Autonomous Domain Types)**:
   - `src/domain/building/types.ts` is fully self-contained with no dependency on `work/building/harness.ts`.
   - Harness file `work/building/harness.ts` imports and re-exports from `src/domain/building/types.ts`.

10. **DEF-BUILD-10 (Bounded Undo History)**:
    - `pushUndoState` enforces `MAX_UNDO_DEPTH = 30` to prevent memory accumulation and save file bloat.

11. **Canonical Engine Clock & Event Compliance (`bdc9c35`)**:
    - `advanceBuilding` receives end-of-step elapsed time and invalidates the `undoStack` without incrementing `clock.simMinute` (core owns clock).
    - Every successful action emits a typed `DomainEvent` with sequence and payload for downstream systems (goals, audio, achievements).

---

## Verification Test Results

- **Strict TypeScript Typecheck**:
  ```bash
  /Users/russell/.codex/worktrees/cats-foundation/Cats/node_modules/.bin/tsc --target ES2022 --module esnext --moduleResolution bundler --strict --skipLibCheck --noEmit src/domain/building/*.ts
  # Result: 0 errors
  ```
- **Builder Test Suite**:
  `tests/domain/building/building.test.ts` (16 tests) -> **16 PASSED**
- **Repair Regression Test Suite**:
  `tests/domain/building/building-repairs.test.ts` (20 tests) -> **20 PASSED**
- **Total Domain Tests**: **36 PASSED / 0 FAILED**

---

## Remaining Integration Gates

- [x] Building Subsystem repairs implemented and verified in worktree custody.
- [ ] Core engine integration: import `reduceBuilding` and `advanceBuilding` in `cats-engine` dispatcher.
- [ ] World renderer connection: PixiJS building tool visualizer (owned by AGY world lane).
