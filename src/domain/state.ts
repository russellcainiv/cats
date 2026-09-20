/**
 * Cats Domain State Model & Schema
 *
 * Fully typed, immutable, canonical state for the Cats simulation engine.
 */

import { RngStateSnapshot, SeededRng } from './rng';

export type HouseholdId = string;
export type CatId = string;
export type LotId = string;
export type ObjectId = string;
export type PregnancyId = string;
export type MemorialId = string;
export type CommandId = string;
export type EventId = string;
export type GoalId = string;

export type LifeStatus = 'living' | 'deceased';
export type LifeStage = 'kitten' | 'adolescent' | 'adult' | 'elder';

// Fixed Life Stage Balancing Constants (R23: 150 sim days fixed, 1 sim day = 1440 sim minutes)
export const SIM_MINUTES_PER_DAY = 1440;
export const STAGE_DAYS = {
  kitten: 10,       // 14,400 min
  adolescent: 20,   // 28,800 min
  adult: 95,        // 136,800 min
  elder: 25,        // 36,000 min
} as const;
export const TOTAL_LIFESPAN_DAYS = 150; // 216,000 min total fixed lifespan
export const TOTAL_LIFESPAN_MINUTES = TOTAL_LIFESPAN_DAYS * SIM_MINUTES_PER_DAY;

// Maximum Capacity Constants (R20, R21)
export const MAX_LIVING_CATS_CAPACITY = 8;
export const MAX_EVENTS_LOG_SIZE = 128;
export const MAX_RECEIPTS_LOG_SIZE = 100;

// Needs Decay Rates per Sim Minute
export const NEED_DECAY_RATES = {
  hunger: 0.08,
  hygiene: 0.04,
  energy: 0.06,
  comfort: 0.03,
  social: 0.02,
  fun: 0.02,
  health: 0.01,
} as const;

// Mood Band Ranges (0 - 100)
export type MoodBand = 'miserable' | 'low' | 'okay' | 'happy' | 'ecstatic';

export type PersonalityTrait =
  | 'playful'
  | 'lazy'
  | 'affectionate'
  | 'aloof'
  | 'skittish'
  | 'curious'
  | 'glutton'
  | 'vocal'
  | 'mischievous'
  | 'zen';

export interface CatAppearance {
  breed: string;
  primaryColor: string;
  secondaryColor?: string;
  pattern: 'solid' | 'tabby' | 'bicolor' | 'calico' | 'tortoiseshell' | 'pointed';
  eyeColor: 'green' | 'amber' | 'blue' | 'copper' | 'heterochromia';
  bodyType: 'petite' | 'average' | 'stocky' | 'fluffy';
  collarColor?: string;
  accessoryId?: string;
}

export interface CatNeeds {
  hunger: number;   // 0 - 100
  hygiene: number;  // 0 - 100
  energy: number;   // 0 - 100
  comfort: number;  // 0 - 100
  social: number;   // 0 - 100
  fun: number;      // 0 - 100
  health: number;   // 0 - 100
}

export interface CatPosition {
  lotId: LotId;
  x: number;
  y: number;
  facing: 'north' | 'south' | 'east' | 'west';
}

export interface GridCell {
  x: number;
  y: number;
}

export interface ActionQueueItem {
  id: string;
  type: string;
  targetId?: string;
  targetPosition?: GridCell;
  durationMinutes: number;
  elapsedMinutes: number;
  isInterruptible: boolean;
  autonomous: boolean;
  payload?: Record<string, unknown>;
}

export interface CatSkills {
  hunting: number;    // 0 - 10
  charisma: number;   // 0 - 10
  agility: number;    // 0 - 10
  creativity: number; // 0 - 10
  tinkering: number;  // 0 - 10
}

export interface RelationshipRecord {
  targetCatId: CatId;
  friendship: number; // -100 to 100
  romance: number;    // 0 to 100
  isLove: boolean;
  lastInteractionMinute: number;
}

export interface CareerOutfit {
  outfitId: string;
  careerId: string;
  rank: number;
}

export interface CatRecord {
  id: CatId;
  householdId: HouseholdId;
  name: string;
  appearance: CatAppearance;
  baseAppearance: CatAppearance;
  careerOutfit?: CareerOutfit | null;
  isAtWork?: boolean;
  traits: PersonalityTrait[];
  lifeStage: LifeStage;
  ageMinutes: number;
  lifeStatus: LifeStatus;
  needs: CatNeeds;
  moodScore: number;
  moodBand: MoodBand;
  skills: CatSkills;
  position: CatPosition;
  currentAction: ActionQueueItem | null;
  actionQueue: ActionQueueItem[];
  lastRoute: GridCell[];
  relationships: Record<CatId, RelationshipRecord>;
  motherId?: CatId;
  fatherId?: CatId;
  pregnancyId?: PregnancyId;
  createdAtSimMinute: number;
}

export interface PregnancyRecord {
  id: PregnancyId;
  parentIds: [CatId, CatId];
  startedAtSimMinute: number;
  dueAtSimMinute: number;
  reservedSlots: number;
  conceptionEventId: string;
}

export interface MemorialRecord {
  id: MemorialId;
  deceasedCatId: CatId;
  name: string;
  catName?: string;
  appearance: CatAppearance;
  traits: PersonalityTrait[];
  ageAtDeathMinutes: number;
  causeOfDeath: string;
  deceasedAtSimMinute: number;
  tombstonePosition: { lotId: LotId; x: number; y: number };
  ghostVisits: Array<{ simMinute: number; durationMinutes: number }>;
}

export interface GhostProjection {
  memorialId: MemorialId;
  name: string;
  appearance: CatAppearance;
  position: CatPosition;
  expiresAtSimMinute: number;
}

export interface LotObject {
  id: ObjectId;
  catalogId: string;
  name: string;
  category: 'seating' | 'sleep' | 'care' | 'play' | 'skill' | 'storage' | 'decor' | 'construction';
  x: number;
  y: number;
  width: number;
  height: number;
  interactSpots: GridCell[];
  provenance: 'earned' | 'free_build';
}

export interface WallSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  provenance: 'earned' | 'free_build';
}

export interface DoorItem {
  id: string;
  x: number;
  y: number;
  orientation: 'horizontal' | 'vertical';
  provenance: 'earned' | 'free_build';
}

export interface WorldLot {
  id: LotId;
  type: 'home' | 'npc_home' | 'park' | 'shop' | 'cafe';
  name: string;
  width: number;
  height: number;
  blockedCells: string[]; // Set of "x,y" string keys
  walls: WallSegment[];
  doors: DoorItem[];
  objects: LotObject[];
}

export interface Wallet {
  earnedCash: number;
  freeBuildCash: number;
  mode: 'normal' | 'free-build-preview' | 'free-build-committed';
}

export interface InventoryItem {
  id: string;
  catalogId: string;
  quantity: number;
  provenance: 'earned' | 'free_build';
}

export interface CareerRecord {
  catId: CatId;
  careerId: 'cafe_assistant' | 'garden_keeper' | 'gallery_helper';
  rank: 1 | 2 | 3;
  shiftStartHour: number;
  shiftEndHour: number;
  workDays: number[];
  performance: number;
  isAtWork?: boolean;
  hourlyWage?: number;
}

export interface CafeBusiness {
  owned: boolean;
  recipes: Array<{ id: string; name: string; cost: number; price: number; unlocked: boolean }>;
  supplies: Record<string, number>;
  dailyRevenue: number;
}

export interface GoalRecord {
  id: GoalId;
  title: string;
  category: 'care' | 'relationships' | 'building' | 'work' | 'hobbies' | 'business' | 'neighborhood' | 'legacy';
  completed: boolean;
  progress: number;
  target: number;
  rewardCash: number;
}

export interface SimClock {
  simMinute: number;
  isPaused: boolean;
  speed: 1;
  fractionalMinutes?: number;
}

export interface CommandContext {
  actorId: string;
  commandId: string;
  timestamp?: number;
}

export interface RngStateData {
  seed: number;
  counter: number;
  serializedState: string;
}

export interface CommandReceipt {
  commandId: string;
  simMinute: number;
  actorId: string;
  type: string;
  success: boolean;
  receiptChecksum: string;
}

export interface DomainEvent {
  id: EventId;
  type: string;
  sequence: number;
  simTime: number;
  actorIds: string[];
  payload: Record<string, unknown>;
  rngLabel?: string;
}

export interface BuildingSubsystemState {
  lots: Record<LotId, WorldLot>;
  activeFreeBuild: boolean;
}

export interface SocialSubsystemState {
  recentInteractions: Array<{ fromId: CatId; toId: CatId; type: string; simMinute: number }>;
}

export interface EconomySubsystemState {
  wallet: Wallet;
  inventory: Record<string, InventoryItem>;
  careers: Record<CatId, CareerRecord>;
  cafe: CafeBusiness;
  goals: Record<GoalId, GoalRecord>;
}

export interface NeighborhoodSubsystemState {
  activeLotId: LotId;
  npcCats: Record<CatId, CatRecord>;
}

export interface LifecycleSubsystemState {
  pregnancies: Record<PregnancyId, PregnancyRecord>;
  memorials: Record<MemorialId, MemorialRecord>;
  ghosts: GhostProjection[];
}

export interface WorldState {
  schemaVersion: number;
  catalogVersion: number;
  householdId: HouseholdId;
  householdName: string;
  ownerId: string;
  revision: number;
  clock: SimClock;
  rng: RngStateData;
  selectedCatId: CatId | null;
  livingCatIds: CatId[];
  cats: Record<CatId, CatRecord>;
  building: BuildingSubsystemState;
  social: SocialSubsystemState;
  economy: EconomySubsystemState;
  neighborhood: NeighborhoodSubsystemState;
  lifecycle: LifecycleSubsystemState;
  commandReceipts: CommandReceipt[];
  events: DomainEvent[];
  nextEventSequence: number;
}

export interface SaveEnvelope {
  schemaVersion: number;
  catalogVersion: number;
  revision: number;
  leaseEpoch: number;
  simMinute: number;
  rngState: string;
  world: WorldState;
  checksum: string;
}

/**
 * Calculates LifeStage from age in minutes based on fixed 150-sim-day timeline
 */
export function getLifeStageForAgeMinutes(ageMinutes: number): LifeStage {
  const kittenMax = STAGE_DAYS.kitten * SIM_MINUTES_PER_DAY;
  const adolescentMax = (STAGE_DAYS.kitten + STAGE_DAYS.adolescent) * SIM_MINUTES_PER_DAY;
  const adultMax = (STAGE_DAYS.kitten + STAGE_DAYS.adolescent + STAGE_DAYS.adult) * SIM_MINUTES_PER_DAY;

  if (ageMinutes < kittenMax) {
    return 'kitten';
  } else if (ageMinutes < adolescentMax) {
    return 'adolescent';
  } else if (ageMinutes < adultMax) {
    return 'adult';
  } else {
    return 'elder';
  }
}

/**
 * Calculates available pregnancy capacity: 8 - livingCount - sum(reservedSlots)
 */
export function calculateAvailableCapacity(state: WorldState): number {
  const livingCount = state.livingCatIds.length;
  let reservedSlots = 0;
  for (const preg of Object.values(state.lifecycle.pregnancies)) {
    reservedSlots += preg.reservedSlots;
  }
  return Math.max(0, MAX_LIVING_CATS_CAPACITY - livingCount - reservedSlots);
}
