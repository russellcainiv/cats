# Building Subsystem Integration Document (`work/building/INTEGRATION.md`)

## 1. Schema Extensions (Conforming to Canonical Engine Core `bdc9c35`)
The building subsystem module interface is aligned with canonical core types (`/Users/russell/.codex/worktrees/cats-engine/Cats/src/domain/state.ts` at `bdc9c35`) using compatible typed extension adapters:

### WorldLot Extensions
- `windows?: WindowItem[]`
  - `id: string`
  - `x: number`, `y: number`
  - `orientation: 'horizontal' | 'vertical'`
  - `provenance: 'earned' | 'free_build'`
- `floorFinishes?: FloorFinishSegment[]`
  - `id: string`
  - `x: number`, `y: number`, `width: number`, `height: number`
  - `finishId: string`
  - `provenance: 'earned' | 'free_build'`
- `WallSegment`: includes optional `finishId?: string`.
- `LotObject`: includes `rotation?: 0 | 90 | 180 | 270` and `colorVariant?: string`.

### BuildingSubsystemState Extensions
- `undoStack?: Record<LotId, UndoRedoStack>`
  - `UndoRedoEntry`: `{ lot: WorldLot; wallet: Wallet }` (snapshots lot geometry and economy wallet atomically to prevent money duplication/loss on undo/redo; bounded to depth 30).
  - `UndoRedoStack`: `{ past: UndoRedoEntry[]; future: UndoRedoEntry[] }`
- `previewLot?: WorldLot` (holds free-build or draft session state)
- `lastBuildSessionSimMinute?: number`

---

## 2. Supported Commands
Exported via `BuildingCommand` discriminator:

1. `BUY_AND_PLACE_OBJECT`: `{ lotId: LotId; catalogId: string; x: number; y: number; rotation?: 0|90|180|270; colorVariant?: string }`
2. `MOVE_OBJECT`: `{ lotId: LotId; objectId: ObjectId; x: number; y: number; rotation?: 0|90|180|270 }`
3. `ROTATE_OBJECT`: `{ lotId: LotId; objectId: ObjectId; rotation: 0|90|180|270 }`
4. `RECOLOR_OBJECT`: `{ lotId: LotId; objectId: ObjectId; colorVariant: string }`
5. `SELL_OBJECT`: `{ lotId: LotId; objectId: ObjectId }`
6. `BUILD_WALL`: `{ lotId: LotId; x1: number; y1: number; x2: number; y2: number; finishId?: string }`
7. `REMOVE_WALL`: `{ lotId: LotId; wallId: string }`
8. `PLACE_DOOR`: `{ lotId: LotId; x: number; y: number; orientation: 'horizontal' | 'vertical' }`
9. `REMOVE_DOOR`: `{ lotId: LotId; doorId: string }`
10. `PLACE_WINDOW`: `{ lotId: LotId; x: number; y: number; orientation: 'horizontal' | 'vertical' }`
11. `REMOVE_WINDOW`: `{ lotId: LotId; windowId: string }`
12. `SET_FLOOR_FINISH`: `{ lotId: LotId; x: number; y: number; width: number; height: number; finishId: string }`
13. `SET_WALL_FINISH`: `{ lotId: LotId; wallId: string; finishId: string }`
14. `DEMOLISH_ROOM`: `{ lotId: LotId; bounds: { minX: number; minY: number; maxX: number; maxY: number } }`
15. `UNDO_BUILD_ACTION`: `{ lotId: LotId }`
16. `REDO_BUILD_ACTION`: `{ lotId: LotId }`
17. `ENTER_FREE_BUILD`: `{}`
18. `COMMIT_FREE_BUILD`: `{}`
19. `CANCEL_FREE_BUILD`: `{}`

---

## 3. Domain Events Emitted
Every successful building command returns typed `DomainEvent` records for downstream consumption (goals, sound, achievements, economy logs):
- `OBJECT_PLACED`: `{ lotId, objectId, catalogId, x, y, rotation, cost }`
- `OBJECT_MOVED`: `{ lotId, objectId, x, y, rotation }`
- `OBJECT_ROTATED`: `{ lotId, objectId, rotation }`
- `OBJECT_RECOLORED`: `{ lotId, objectId, colorVariant }`
- `OBJECT_SOLD`: `{ lotId, objectId, catalogId, refundAmount }`
- `WALL_BUILT`: `{ lotId, wallId, x1, y1, x2, y2, cost }`
- `WALL_REMOVED`: `{ lotId, wallId }`
- `DOOR_PLACED`: `{ lotId, doorId, x, y, orientation, cost }`
- `DOOR_REMOVED`: `{ lotId, doorId }`
- `WINDOW_PLACED`: `{ lotId, windowId, x, y, orientation, cost }`
- `WINDOW_REMOVED`: `{ lotId, windowId }`
- `FLOOR_FINISH_SET`: `{ lotId, finishId, x, y, width, height, cost }`
- `WALL_FINISH_SET`: `{ lotId, wallId, finishId, cost }`
- `ROOM_DEMOLISHED`: `{ lotId, bounds, totalRefund }`
- `BUILD_ACTION_UNDONE`: `{ lotId }`
- `BUILD_ACTION_REDONE`: `{ lotId }`
- `FREE_BUILD_ENTERED`: `{}`
- `FREE_BUILD_COMMITTED`: `{}`
- `FREE_BUILD_CANCELLED`: `{}`

---

## 4. Deterministic Simulation & Clock Contract
- **Deterministic IDs & Checksums**: Zero non-deterministic functions (`Date.now()`, `Math.random()`) are used. IDs are deterministically derived using `state.nextEventSequence`, catalog IDs, and coordinates. Receipt checksums use a deterministic 32-bit polynomial hash matching core idempotency rules.
- **Clock Ownership**: Core engine owns the simulation clock (`simMinute`). `advanceBuilding(state, elapsedSimMinutes)` receives end-of-step elapsed time and invalidates the session `undoStack` without double-incrementing the clock.
- **Coordinate Sanitization**: All inputs validate that coordinates are finite integers in-bounds; non-finite (`NaN`, `Infinity`) or diagonal wall coordinates are rejected without state or wallet corruption.
- **Topological Integrity**: Doors and windows require existing wall support; direct wall-on-cat placement is rejected; demolition and wall removal automatically clean up orphaned doors/windows.

---

## 5. Public Domain Module Entry Points
Exported from `src/domain/building/index.ts`:

- `reduceBuilding(state: WorldState, command: BuildingCommand, context: CommandContext): CommandResult`
- `advanceBuilding(state: WorldState, elapsedSimMinutes: number): WorldState`
- `initializeBuildingState(): BuildingSubsystemState`
- `isBuildingCommand(command: unknown): command is BuildingCommand`
- `FURNITURE_CATALOG`: Array of 30 furniture entries with costs, dimensions, categories, interact spots, recolors.
