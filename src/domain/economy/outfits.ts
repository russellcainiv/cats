// src/domain/economy/outfits.ts

import { WorldState } from '../types';
import { OutfitProjection, CAREER_OUTFITS } from './types';

/**
 * Derived read-only projection for renderer to know what outfit a cat is wearing.
 * Cats wear clothes relating to their careers when departing, working, or returning.
 * Restores ordinary appearance on return/cancel/job change/off-work.
 */
export function getVisibleOutfit(state: WorldState, catId: string): OutfitProjection {
  const economy = state.economy as any;
  const workState = economy?.extensions?.workStates?.[catId];
  const careerRecord = economy?.careers?.[catId];

  if (!careerRecord || !workState || workState.status === 'off_work') {
    return {
      catId,
      isWorking: false,
      careerId: careerRecord?.careerId || null,
      outfitId: null,
      outfitDetails: null
    };
  }

  const outfitDef = CAREER_OUTFITS[careerRecord.careerId];

  return {
    catId,
    isWorking: workState.status === 'working' || workState.status === 'departing' || workState.status === 'returning',
    careerId: careerRecord.careerId,
    outfitId: outfitDef ? outfitDef.id : null,
    outfitDetails: outfitDef || null
  };
}
