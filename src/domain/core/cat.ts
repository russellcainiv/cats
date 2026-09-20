/**
 * Cat Entity Creation, Traits, and Aging Transitions
 */

import {
  CatAppearance,
  CatId,
  CatPosition,
  CatRecord,
  CatSkills,
  getLifeStageForAgeMinutes,
  HouseholdId,
  LifeStage,
  PersonalityTrait,
  SIM_MINUTES_PER_DAY,
  STAGE_DAYS,
  TOTAL_LIFESPAN_MINUTES,
} from '../state';
import { calculateMood } from './needs';

export interface CreateCatOptions {
  id?: CatId;
  householdId: HouseholdId;
  name: string;
  appearance: CatAppearance;
  traits: PersonalityTrait[];
  lifeStage?: LifeStage;
  ageMinutes?: number;
  position?: CatPosition;
  createdAtSimMinute?: number;
  motherId?: CatId;
  fatherId?: CatId;
}

export function validateCatName(name: string): { valid: boolean; error?: string; trimmedName: string } {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length === 0) {
    return { valid: false, error: 'Cat name cannot be empty or whitespace', trimmedName: '' };
  }
  if (trimmed.length > 32) {
    return { valid: false, error: 'Cat name cannot exceed 32 characters', trimmedName: trimmed };
  }
  return { valid: true, trimmedName: trimmed };
}

export function createCatRecord(options: CreateCatOptions): CatRecord {
  const { valid, error, trimmedName } = validateCatName(options.name);
  if (!valid) {
    throw new Error(error || 'Invalid cat name');
  }

  const safeName = trimmedName.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'cat';
  const id: CatId = options.id || `cat_${safeName}_${options.createdAtSimMinute ?? 0}`;

  // Default age based on life stage if not provided
  let ageMinutes = options.ageMinutes ?? 0;
  if (options.lifeStage && options.ageMinutes === undefined) {
    switch (options.lifeStage) {
      case 'kitten':
        ageMinutes = 0;
        break;
      case 'adolescent':
        ageMinutes = STAGE_DAYS.kitten * SIM_MINUTES_PER_DAY;
        break;
      case 'adult':
        ageMinutes = (STAGE_DAYS.kitten + STAGE_DAYS.adolescent) * SIM_MINUTES_PER_DAY;
        break;
      case 'elder':
        ageMinutes = (STAGE_DAYS.kitten + STAGE_DAYS.adolescent + STAGE_DAYS.adult) * SIM_MINUTES_PER_DAY;
        break;
    }
  }

  const lifeStage = getLifeStageForAgeMinutes(ageMinutes);

  const starterNeeds = {
    hunger: 85,
    hygiene: 90,
    energy: 90,
    comfort: 85,
    social: 80,
    fun: 80,
    health: 100,
  };

  const { score: moodScore, band: moodBand } = calculateMood(starterNeeds, options.traits);

  const starterSkills: CatSkills = {
    hunting: 1,
    charisma: 1,
    agility: 1,
    creativity: 1,
    tinkering: 1,
  };

  const position: CatPosition = options.position ?? {
    lotId: 'home',
    x: 4,
    y: 4,
    facing: 'south',
  };

  return {
    id,
    householdId: options.householdId,
    name: trimmedName,
    appearance: { ...options.appearance },
    baseAppearance: { ...options.appearance },
    careerOutfit: null,
    isAtWork: false,
    traits: [...options.traits],
    lifeStage,
    ageMinutes,
    lifeStatus: 'living',
    needs: starterNeeds,
    moodScore,
    moodBand,
    skills: starterSkills,
    position,
    currentAction: null,
    actionQueue: [],
    lastRoute: [],
    relationships: {},
    motherId: options.motherId,
    fatherId: options.fatherId,
    createdAtSimMinute: options.createdAtSimMinute ?? 0,
  };
}

export interface AgeAdvanceResult {
  cat: CatRecord;
  stageChanged: boolean;
  oldStage?: LifeStage;
  newStage?: LifeStage;
  reachedLifespanEnd: boolean;
}

export function advanceCatAge(cat: CatRecord, elapsedMinutes: number): AgeAdvanceResult {
  if (cat.lifeStatus !== 'living') {
    return { cat, stageChanged: false, reachedLifespanEnd: false };
  }

  const newAgeMinutes = cat.ageMinutes + elapsedMinutes;
  const oldStage = cat.lifeStage;
  const newStage = getLifeStageForAgeMinutes(newAgeMinutes);
  const stageChanged = oldStage !== newStage;
  const reachedLifespanEnd = newAgeMinutes >= TOTAL_LIFESPAN_MINUTES;

  const updatedCat: CatRecord = {
    ...cat,
    ageMinutes: newAgeMinutes,
    lifeStage: newStage,
  };

  return {
    cat: updatedCat,
    stageChanged,
    oldStage: stageChanged ? oldStage : undefined,
    newStage: stageChanged ? newStage : undefined,
    reachedLifespanEnd,
  };
}
