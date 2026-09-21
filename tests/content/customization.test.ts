import { test, expect, describe } from 'bun:test';
import { CustomizationManager } from '../../src/content/customization/manager';
import { CatWardrobeState, BaseGeneticAppearance } from '../../src/content/customization/types';
import {
  WARDROBE_ACCESSORIES,
  CAREER_OUTFITS,
  COAT_VARIANTS,
  EYE_COLOR_PALETTES,
  ROOM_SWATCHES,
} from '../../src/content/customization/catalog';

describe('Customization, Wardrobe & Career Outfit Tests', () => {
  const manager = new CustomizationManager();

  const initialBaseGenetics: BaseGeneticAppearance = {
    breedId: 'bengal',
    coatVariantId: 'coat_rosette_bengal',
    eyeColorId: 'eye_amber_gold',
    ancestryIds: ['dam_cat_01', 'sire_cat_02'],
  };

  const initialWardrobe: CatWardrobeState = {
    catId: 'cat_test_01',
    baseGenetics: initialBaseGenetics,
    ownedAccessoryIds: ['collar_bell_gold'],
    isOnShift: false,
  };

  test('Catalog counts meet requirements (12 accessories, 9 career outfits, 16 coats, 8 eye colors, room swatches)', () => {
    expect(WARDROBE_ACCESSORIES.length).toBe(12);
    expect(CAREER_OUTFITS.length).toBe(9);
    expect(COAT_VARIANTS.length).toBe(16);
    expect(EYE_COLOR_PALETTES.length).toBe(8);
    expect(ROOM_SWATCHES.length).toBeGreaterThanOrEqual(8);
  });

  test('Equipping owned accessory succeeds with valid palette', () => {
    const res = manager.equipAccessory(initialWardrobe, 'collar_bell_gold', 'ruby_red');
    expect(res.success).toBe(true);
    expect(res.updatedWardrobe.equippedAccessoryId).toBe('collar_bell_gold');
    expect(res.updatedWardrobe.equippedAccessoryPalette).toBe('ruby_red');
  });

  test('Equipping unowned accessory fails', () => {
    const res = manager.equipAccessory(initialWardrobe, 'bowtie_dapper');
    expect(res.success).toBe(false);
    expect(res.error).toContain('not owned');
  });

  test('Equipping incompatible palette variant fails', () => {
    const res = manager.equipAccessory(initialWardrobe, 'collar_bell_gold', 'neon_invalid');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Incompatible palette variant');
  });

  test('Purchasing accessory deducts coins atomically and adds to owned accessories', () => {
    const res = manager.purchaseAccessory(initialWardrobe, 100, 'bowtie_dapper');
    expect(res.success).toBe(true);
    expect(res.remainingCoins).toBe(70); // 100 - 30
    expect(res.updatedWardrobe.ownedAccessoryIds).toContain('bowtie_dapper');
  });

  test('Purchasing accessory fails when insufficient funds', () => {
    const res = manager.purchaseAccessory(initialWardrobe, 10, 'bowtie_dapper');
    expect(res.success).toBe(false);
    expect(res.remainingCoins).toBe(10);
    expect(res.error).toContain('Insufficient coins');
  });

  test('Job transitions apply career outfit overlays during shifts and restore ordinary look on return/cancel/jobchange without mutating base genetic appearance', () => {
    // 1. Assign job and start shift
    let wardrobe = manager.updateJobState(initialWardrobe, 'change_job', 'cafe_assistant', 2);
    wardrobe = manager.updateJobState(wardrobe, 'start_shift');

    let look = manager.evaluateRenderedLook(wardrobe);
    expect(look.activeCareerOutfit).toBeDefined();
    expect(look.activeCareerOutfit?.id).toBe('outfit_cafe_rank2');
    expect(look.activeCareerOutfit?.careerTrackId).toBe('cafe_assistant');

    // Verify base genetics remain 100% identical
    expect(look.baseGenetics).toEqual(initialBaseGenetics);
    expect(look.isQuadrupedWithPaws).toBe(true);

    // 2. Return from shift
    wardrobe = manager.updateJobState(wardrobe, 'end_shift');
    look = manager.evaluateRenderedLook(wardrobe);
    expect(look.activeCareerOutfit).toBeUndefined(); // Ordinary look restored
    expect(look.baseGenetics).toEqual(initialBaseGenetics);

    // 3. Start shift on another job
    wardrobe = manager.updateJobState(wardrobe, 'change_job', 'garden_keeper', 3);
    wardrobe = manager.updateJobState(wardrobe, 'start_shift');
    look = manager.evaluateRenderedLook(wardrobe);
    expect(look.activeCareerOutfit?.id).toBe('outfit_garden_rank3');

    // 4. Cancel shift
    wardrobe = manager.updateJobState(wardrobe, 'cancel_shift');
    look = manager.evaluateRenderedLook(wardrobe);
    expect(look.activeCareerOutfit).toBeUndefined();
    expect(look.baseGenetics).toEqual(initialBaseGenetics);
  });

  test('Serialization and reload adapter simulation preserves wardrobe state and base genetics', () => {
    let wardrobe = manager.updateJobState(initialWardrobe, 'change_job', 'gallery_helper', 1);
    const buyRes = manager.purchaseAccessory(wardrobe, 200, 'scarf_cozy_knitted');
    expect(buyRes.success).toBe(true);
    wardrobe = buyRes.updatedWardrobe;

    const equipRes = manager.equipAccessory(wardrobe, 'scarf_cozy_knitted', 'cream_wool');
    expect(equipRes.success).toBe(true);
    wardrobe = equipRes.updatedWardrobe;

    // Simulate JSON serialize and deserialize reload roundtrip
    const serializedJson = JSON.stringify(wardrobe);
    const reloadedWardrobe: CatWardrobeState = JSON.parse(serializedJson);

    expect(reloadedWardrobe.catId).toBe('cat_test_01');
    expect(reloadedWardrobe.equippedAccessoryId).toBe('scarf_cozy_knitted');
    expect(reloadedWardrobe.equippedAccessoryPalette).toBe('cream_wool');
    expect(reloadedWardrobe.baseGenetics).toEqual(initialBaseGenetics);

    const reloadedLook = manager.evaluateRenderedLook(reloadedWardrobe);
    expect(reloadedLook.activeAccessory?.id).toBe('scarf_cozy_knitted');
    expect(reloadedLook.activeAccessory?.palette).toBe('cream_wool');
  });
});
