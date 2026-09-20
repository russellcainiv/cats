# Building Subsystem Integration Document (`work/building/INTEGRATION.md`)

## 1. Schema Extensions
The building subsystem extends the core schema (`shared-engine-contract.md`) with the following typed extensions:

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
- `undoStack?: Record<LotId, { past: WorldLot[]; future: WorldLot[] }>`
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

## 3. Public Domain Module Entry Points
Exported from `src/domain/building/index.ts`:

- `reduceBuilding(state: WorldState, command: BuildingCommand, context: CommandContext): CommandResult`
- `advanceBuilding(state: WorldState, elapsedSimMinutes: number): WorldState`
- `initializeBuildingState(): BuildingSubsystemState`
- `isBuildingCommand(command: GameCommand): command is BuildingCommand`
- `FURNITURE_CATALOG`: Array of 30 furniture & construction entries with costs, dimensions, categories, interact spots, recolors.
