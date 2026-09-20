// src/domain/social/readiness.ts
// Readiness matrix and eligibility checks for social and romantic interactions.

import {
  WorldState,
  CatRecord,
  CatId,
  SocialSubsystemState
} from './types';
import { pairKey, getRelationship, calculateMoodScore } from './relationships';

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  initiator?: CatRecord;
  partner?: CatRecord;
}

export function checkMooMooEligibility(
  state: WorldState,
  initiatorId: CatId,
  partnerId: CatId
): EligibilityResult {
  const initiator = state.cats[initiatorId];
  const partner = state.cats[partnerId];

  if (!initiator || !partner) {
    return { eligible: false, reason: 'One or both cats do not exist' };
  }

  if (initiator.id === partner.id) {
    return { eligible: false, reason: 'A cat cannot Moo-Moo with itself' };
  }

  if (initiator.lifeStatus !== 'living' || partner.lifeStatus !== 'living') {
    return { eligible: false, reason: 'Both cats must be living' };
  }

  // Adults check
  if (initiator.lifeStage !== 'adult' || partner.lifeStage !== 'adult') {
    return { eligible: false, reason: 'Must be adult: Cats must be adults to Moo-Moo' };
  }

  // Close family links check with canonical motherId/fatherId and validated fallback for legacy family fields
  const dam1 = initiator.motherId ?? initiator.family?.damId ?? undefined;
  const sire1 = initiator.fatherId ?? initiator.family?.sireId ?? undefined;
  const dam2 = partner.motherId ?? partner.family?.damId ?? undefined;
  const sire2 = partner.fatherId ?? partner.family?.sireId ?? undefined;

  const isParentChild =
    (dam1 && dam1 === partner.id) ||
    (sire1 && sire1 === partner.id) ||
    (dam2 && dam2 === initiator.id) ||
    (sire2 && sire2 === initiator.id);

  const isSibling =
    (dam1 && dam2 && dam1 === dam2) ||
    (sire1 && sire2 && sire1 === sire2);

  if (isParentChild || isSibling) {
    return { eligible: false, reason: 'Close family members cannot Moo-Moo' };
  }

  // Work & Pregnancy availability checks
  if (initiator.isWorking || partner.isWorking || (initiator as any).isAtWork || (partner as any).isAtWork) {
    return { eligible: false, reason: 'Working cats are unavailable' };
  }

  if (initiator.isPregnant || partner.isPregnant || initiator.pregnancyId || partner.pregnancyId) {
    return { eligible: false, reason: 'Pregnant cats are unavailable for Moo-Moo' };
  }

  // Illness & Needs check
  if ((initiator as any).isIll || (partner as any).isIll) {
    return { eligible: false, reason: 'Ill cats are not in the mood' };
  }

  if (initiator.needs.energy < 30 || partner.needs.energy < 30) {
    return { eligible: false, reason: 'One or both cats are too tired / not in the mood' };
  }

  if (initiator.needs.social < 30 || partner.needs.social < 30) {
    return { eligible: false, reason: 'One or both cats are socially depleted / not in the mood' };
  }

  if (initiator.needs.health < 35 || partner.needs.health < 35) {
    return { eligible: false, reason: 'One or both cats are in poor health' };
  }

  // Mood checks
  const initiatorMood = calculateMoodScore(initiator);
  const partnerMood = calculateMoodScore(partner);

  if (initiatorMood < 60 || partnerMood < 60) {
    return { eligible: false, reason: 'One or both cats are not in the mood (mood >= 60 required)' };
  }

  // Pair Cooldown check
  const pKey = pairKey(initiatorId, partnerId);
  const cooldownExpires = state.social?.pairCooldowns?.[pKey] || 0;
  if (cooldownExpires > state.clock.simMinute) {
    return { eligible: false, reason: 'Pair cooldown is active for these cats' };
  }

  // Mutual Love / Relationship check
  const rel = getRelationship(state.social, initiatorId, partnerId, state.cats);
  const catRel1 = initiator.relationships?.[partnerId];
  const catRel2 = partner.relationships?.[initiatorId];
  const r1 = catRel1 !== undefined ? (catRel1.romance ?? 0) : rel.romance;
  const r2 = catRel2 !== undefined ? (catRel2.romance ?? 0) : rel.romance;
  const f1 = catRel1 !== undefined ? (catRel1.friendship ?? 0) : rel.friendship;
  const f2 = catRel2 !== undefined ? (catRel2.friendship ?? 0) : rel.friendship;
  const love1 = catRel1 !== undefined ? Boolean(catRel1.isLove) : rel.isLove;
  const love2 = catRel2 !== undefined ? Boolean(catRel2.isLove) : rel.isLove;

  if (r1 < 70 || r2 < 70 || f1 < 40 || f2 < 40 || !love1 || !love2) {
    return { eligible: false, reason: 'Cats must be in mutual love (romance >= 70, friendship >= 40)' };
  }

  return { eligible: true, initiator, partner };
}

export function checkGeneralSocialEligibility(
  state: WorldState,
  initiatorId: CatId,
  targetId: CatId
): EligibilityResult {
  const initiator = state.cats[initiatorId];
  const target = state.cats[targetId];

  if (!initiator || !target) {
    return { eligible: false, reason: 'One or both cats do not exist' };
  }

  if (initiator.id === target.id) {
    return { eligible: false, reason: 'A cat cannot socialize with itself' };
  }

  if (initiator.lifeStatus !== 'living' || target.lifeStatus !== 'living') {
    return { eligible: false, reason: 'Both cats must be living' };
  }

  if (initiator.isWorking || target.isWorking) {
    return { eligible: false, reason: 'Working cats are unavailable' };
  }

  const pKey = pairKey(initiatorId, targetId);
  const cooldownExpires = state.social.pairCooldowns[pKey] || 0;
  if (cooldownExpires > state.clock.simMinute) {
    return { eligible: false, reason: 'Pair social cooldown active' };
  }

  return { eligible: true, initiator, partner: target };
}
