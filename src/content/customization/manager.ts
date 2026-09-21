import {
  AccessoryItem,
  CareerOutfitItem,
  CatWardrobeState,
  RenderedCatLook,
  RoomSwatch,
  CareerTrackId,
} from './types';
import { WARDROBE_ACCESSORIES, CAREER_OUTFITS, ROOM_SWATCHES } from './catalog';

export class CustomizationManager {
  private accessoriesMap = new Map<string, AccessoryItem>();
  private careerOutfitsMap = new Map<string, CareerOutfitItem>();
  private roomSwatchesMap = new Map<string, RoomSwatch>();

  constructor() {
    for (const acc of WARDROBE_ACCESSORIES) {
      this.accessoriesMap.set(acc.id, acc);
    }
    for (const outfit of CAREER_OUTFITS) {
      this.careerOutfitsMap.set(outfit.id, outfit);
    }
    for (const swatch of ROOM_SWATCHES) {
      this.roomSwatchesMap.set(swatch.id, swatch);
    }
  }

  public getAccessory(id: string): AccessoryItem | undefined {
    return this.accessoriesMap.get(id);
  }

  public getCareerOutfit(careerTrackId: CareerTrackId, rank: 1 | 2 | 3): CareerOutfitItem | undefined {
    return CAREER_OUTFITS.find((o) => o.careerTrackId === careerTrackId && o.rank === rank);
  }

  public getRoomSwatch(id: string): RoomSwatch | undefined {
    return this.roomSwatchesMap.get(id);
  }

  /**
   * Equips an accessory to a wardrobe state after validating ownership and palette compatibility.
   */
  public equipAccessory(
    wardrobe: CatWardrobeState,
    accessoryId: string,
    paletteVariant?: string
  ): { success: boolean; updatedWardrobe: CatWardrobeState; error?: string } {
    if (!wardrobe.ownedAccessoryIds.includes(accessoryId)) {
      return { success: false, updatedWardrobe: wardrobe, error: `Accessory ${accessoryId} not owned by cat` };
    }

    const accessory = this.getAccessory(accessoryId);
    if (!accessory) {
      return { success: false, updatedWardrobe: wardrobe, error: `Unknown accessory ID: ${accessoryId}` };
    }

    const palette = paletteVariant || accessory.paletteVariants[0];
    if (!accessory.paletteVariants.includes(palette)) {
      return {
        success: false,
        updatedWardrobe: wardrobe,
        error: `Incompatible palette variant '${palette}' for accessory '${accessoryId}'`,
      };
    }

    const updatedWardrobe: CatWardrobeState = {
      ...wardrobe,
      equippedAccessoryId: accessoryId,
      equippedAccessoryPalette: palette,
    };

    return { success: true, updatedWardrobe };
  }

  /**
   * Performs an atomic purchase of an accessory for a cat.
   */
  public purchaseAccessory(
    wardrobe: CatWardrobeState,
    walletCoins: number,
    accessoryId: string
  ): { success: boolean; updatedWardrobe: CatWardrobeState; remainingCoins: number; error?: string } {
    const accessory = this.getAccessory(accessoryId);
    if (!accessory) {
      return { success: false, updatedWardrobe: wardrobe, remainingCoins: walletCoins, error: `Unknown accessory ID: ${accessoryId}` };
    }

    if (wardrobe.ownedAccessoryIds.includes(accessoryId)) {
      return { success: false, updatedWardrobe: wardrobe, remainingCoins: walletCoins, error: `Accessory ${accessoryId} already owned` };
    }

    if (walletCoins < accessory.costCoins) {
      return { success: false, updatedWardrobe: wardrobe, remainingCoins: walletCoins, error: `Insufficient coins: requires ${accessory.costCoins}, has ${walletCoins}` };
    }

    const updatedWardrobe: CatWardrobeState = {
      ...wardrobe,
      ownedAccessoryIds: [...wardrobe.ownedAccessoryIds, accessoryId],
    };

    return {
      success: true,
      updatedWardrobe,
      remainingCoins: walletCoins - accessory.costCoins,
    };
  }

  /**
   * Handles job change, shift departure/return, or shift cancellation.
   * Restores ordinary look / accessories without mutating base genetic appearance.
   */
  public updateJobState(
    wardrobe: CatWardrobeState,
    action: 'start_shift' | 'end_shift' | 'cancel_shift' | 'change_job',
    newJobId?: CareerTrackId,
    newJobRank?: 1 | 2 | 3
  ): CatWardrobeState {
    const updated: CatWardrobeState = { ...wardrobe };

    switch (action) {
      case 'start_shift':
        updated.isOnShift = true;
        break;
      case 'end_shift':
      case 'cancel_shift':
        updated.isOnShift = false;
        break;
      case 'change_job':
        updated.isOnShift = false;
        updated.activeJobId = newJobId;
        updated.activeJobRank = newJobRank || 1;
        break;
    }

    return updated;
  }

  /**
   * Evaluates the rendered cat look layer stack.
   * Career outfit overlays during active shift, base genetics remain unmodified quadrupeds.
   */
  public evaluateRenderedLook(wardrobe: CatWardrobeState): RenderedCatLook {
    let activeCareerOutfit: RenderedCatLook['activeCareerOutfit'] = undefined;

    if (wardrobe.isOnShift && wardrobe.activeJobId && wardrobe.activeJobRank) {
      const outfit = this.getCareerOutfit(wardrobe.activeJobId, wardrobe.activeJobRank);
      if (outfit) {
        activeCareerOutfit = {
          id: outfit.id,
          careerTrackId: outfit.careerTrackId,
          rank: outfit.rank,
          assetKey: outfit.assetKey,
        };
      }
    }

    let activeAccessory: RenderedCatLook['activeAccessory'] = undefined;

    if (wardrobe.equippedAccessoryId) {
      const accessory = this.getAccessory(wardrobe.equippedAccessoryId);
      if (accessory) {
        activeAccessory = {
          id: accessory.id,
          type: accessory.type,
          palette: wardrobe.equippedAccessoryPalette || accessory.paletteVariants[0],
          assetKey: accessory.assetKey,
        };
      }
    }

    return {
      catId: wardrobe.catId,
      baseGenetics: { ...wardrobe.baseGenetics },
      activeAccessory,
      activeCareerOutfit,
      isQuadrupedWithPaws: true,
    };
  }
}

export const defaultCustomizationManager = new CustomizationManager();
