// src/domain/economy/outfits.ts

import { OutfitProjection, CAREER_OUTFITS, CareerId } from './types';

/**
 * Derived read-only projection for renderer to know what outfit a cat is wearing.
 * Cats wear clothes relating to their careers when departing, working, or returning.
 * Restores ordinary appearance on return/cancel/job change/off-work.
 * Preserves coat color, pattern, eye color, and accessories.
 */
export function getVisibleOutfit(state: any, catId: string): OutfitProjection {
  const economy = state?.economy;
  const workState = economy?.extensions?.workStates?.[catId];
  const careerRecord = economy?.careers?.[catId];

  const isWorking = workState?.status === 'working' || workState?.status === 'departing' || workState?.status === 'returning';

  if (!careerRecord || !workState || !isWorking || workState.status === 'off_work') {
    return {
      catId,
      isWorking: false,
      careerId: careerRecord?.careerId || null,
      outfitId: null,
      outfitDetails: null
    };
  }

  const outfitDef = CAREER_OUTFITS[careerRecord.careerId as CareerId];

  return {
    catId,
    isWorking: true,
    careerId: careerRecord.careerId,
    outfitId: outfitDef ? outfitDef.id : null,
    outfitDetails: outfitDef || null
  };
}
