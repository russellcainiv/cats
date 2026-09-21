# Expanded Furniture & Customization Integration Guide & Handoff

This document describes the interface contracts and integration guide for the engine, app, and renderer integrators integrating Task 44 / GitHub Issue 55 (`expanded-customization-and-furniture`).

---

## Module Ownership
- `src/content/furniture/**`: Expanded furniture catalog, legacy 30 catalog, validation rules, and adapter.
- `src/content/customization/**`: Wardrobe accessories, career outfits, coat variants, eye color palettes, room swatches, and customization manager.
- `tests/content/**`: Unit and integration test suites validating the content modules.
- `work/furniture/**`: Documentation, handoff guide, and progress reports.

---

## 1. Furniture Catalog Integration

### Interfaces & Types (`src/content/furniture/types.ts`)
```ts
import { FurnitureCatalogAdapter, defaultFurnitureAdapter } from 'src/content/furniture/adapter';

// Get Engine-compatible item by ID:
const engineItem = defaultFurnitureAdapter.getEngineCatalogItem('cozy_sofa');
/* Returns:
{
  id: 'cozy_sofa',
  name: 'Cozy Cottage Sofa',
  category: 'seating',
  cost: 150,
  width: 2,
  height: 1,
  colorVariants: ['cream_fabric', 'sage_linen', 'dusty_rose'],
  interactSpots: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  requiresWall: false,
  description: 'Plush sofa perfect for afternoon lounging.',
  style: 'cozy_cottage',
  isSolid: true,
  needAffordance: { needType: 'comfort', satisfactionRate: 20 },
  assetKey: 'sofa',
  atlas: 'atlas01',
  artStatus: 'verified_atlas',
  schemaVersion: 1
}
*/
```

### All 30 Legacy Item IDs Preserved
The following 30 legacy items are mapped and available through the adapter:
`food_bowl`, `water_fountain`, `cat_bed_basic`, `scratching_post`, `litter_box`, `feather_toy`, `easel`, `garden_planter`, `cozy_sofa`, `dining_table`, `bookshelf`, `floor_lamp`, `monstera_plant`, `rug_flower`, `grooming_arch`, `laser_pointer_turret`, `cafe_counter`, `cafe_espresso_machine`, `cafe_pastry_display`, `cafe_table`, `cafe_chair`, `wall_clock`, `window_bench`, `wall_shelf`, `pet_bathtub`, `cat_tree_deluxe`, `cardboard_box`, `crinkle_tunnel`, `memorial_statue`, `outdoor_bench`.

---

## 2. Customization & Wardrobe Integration

### Interfaces & Types (`src/content/customization/types.ts`)
```ts
import { CustomizationManager, defaultCustomizationManager } from 'src/content/customization/manager';

// Evaluating rendered cat look (e.g. inside Pixi renderer / DOM HUD):
const look = defaultCustomizationManager.evaluateRenderedLook(catWardrobeState);

/* Returns:
{
  catId: 'cat_01',
  baseGenetics: {
    breedId: 'bengal',
    coatVariantId: 'coat_rosette_bengal',
    eyeColorId: 'eye_amber_gold',
    ancestryIds: [...]
  },
  activeAccessory: {
    id: 'collar_bell_gold',
    type: 'collar',
    palette: 'ruby_red',
    assetKey: 'acc_collar_bell'
  },
  activeCareerOutfit: { // Only present during active shift!
    id: 'outfit_cafe_rank1',
    careerTrackId: 'cafe_assistant',
    rank: 1,
    assetKey: 'outfit_cafe_apron_jr'
  },
  isQuadrupedWithPaws: true
}
*/
```

### Career Shift & Job Transition Restorations
When a cat starts a shift, call `updateJobState(wardrobe, 'start_shift')`.
When a cat returns, cancels a shift, or changes jobs, call `updateJobState(wardrobe, 'end_shift' | 'cancel_shift' | 'change_job')`.
This automatically removes the career outfit overlay and restores ordinary accessories without mutating `baseGenetics`.

---

## 3. Test Verification Commands
To execute the content module tests:
```bash
bun test tests/content/
```
All 16 test cases pass deterministically in < 100ms.
