// src/domain/social/relationships.ts
// Relationship, Personality Traits, and Memory Management.

import {
  SocialSubsystemState,
  SocialRelationship,
  SocialMemory,
  CatRecord,
  InteractionType,
  CatId
} from './types';

export function pairKey(catA: CatId, catB: CatId): string {
  return catA < catB ? `${catA}:${catB}` : `${catB}:${catA}`;
}

export function calculateMoodScore(cat: CatRecord): number {
  const { hunger, hygiene, energy, comfort, social, fun, health } = cat.needs;
  const avg = (hunger + hygiene + energy + comfort + social + fun + health) / 7;
  return Math.round(avg);
}

export function getRelationship(
  socialState: SocialSubsystemState,
  catA: CatId,
  catB: CatId
): SocialRelationship {
  const key = pairKey(catA, catB);
  const existing = socialState.relationships[key];
  if (existing) {
    return existing;
  }
  return {
    friendship: 0,
    romance: 0,
    isLove: false,
    isRival: false,
    isFriend: false,
    interactionCount: 0,
    lastInteractionSimMinute: 0
  };
}

export function updateRelationshipScore(
  rel: SocialRelationship,
  friendshipDelta: number,
  romanceDelta: number,
  simMinute: number
): SocialRelationship {
  const friendship = Math.max(-100, Math.min(100, rel.friendship + friendshipDelta));
  const romance = Math.max(0, Math.min(100, rel.romance + romanceDelta));

  const isFriend = friendship >= 50;
  const isRival = friendship <= -40;
  const isLove = romance >= 70 && friendship >= 40;

  return {
    friendship,
    romance,
    isLove,
    isRival,
    isFriend,
    interactionCount: rel.interactionCount + 1,
    lastInteractionSimMinute: simMinute
  };
}

export function applyTraitModifiers(
  initiator: CatRecord,
  target: CatRecord,
  interactionType: InteractionType,
  baseFriendshipDelta: number,
  baseRomanceDelta: number
): { friendshipDelta: number; romanceDelta: number } {
  let fDelta = baseFriendshipDelta;
  let rDelta = baseRomanceDelta;

  // Trait bonuses/penalties
  if (initiator.traits.includes('affectionate') || target.traits.includes('affectionate')) {
    if (rDelta > 0) rDelta *= 1.3;
    if (fDelta > 0) fDelta *= 1.2;
  }

  if (initiator.traits.includes('playful') && interactionType === 'play_chase') {
    fDelta += 5;
  }

  if (initiator.traits.includes('feisty') || target.traits.includes('feisty')) {
    if (interactionType === 'hiss') {
      fDelta -= 10;
    } else if (fDelta < 0) {
      fDelta *= 1.2;
    }
  }

  if (initiator.traits.includes('loner') || target.traits.includes('loner')) {
    if (fDelta > 0) fDelta *= 0.8;
  }

  if (initiator.traits.includes('gentle') || target.traits.includes('gentle')) {
    if (fDelta < 0) fDelta *= 0.5; // Gentleness reduces negative fallout
  }

  return {
    friendshipDelta: Math.round(fDelta),
    romanceDelta: Math.round(rDelta)
  };
}

const MAX_MEMORIES_PER_CAT = 20;

export function addMemory(
  socialState: SocialSubsystemState,
  catId: CatId,
  memory: Omit<SocialMemory, 'id'>
): SocialSubsystemState {
  const existingMemories = socialState.memories[catId] || [];
  const newMemory: SocialMemory = {
    ...memory,
    id: `mem_${catId}_${memory.simMinute}_${memory.type}_${existingMemories.length + 1}`
  };

  const updatedList = [newMemory, ...existingMemories].slice(0, MAX_MEMORIES_PER_CAT);

  return {
    ...socialState,
    memories: {
      ...socialState.memories,
      [catId]: updatedList
    }
  };
}
