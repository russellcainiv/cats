// src/domain/lifecycle/types.ts
// Pure domain types for the Lifecycle subsystem (gestation, birth, aging, health/hazards, memorials, ghosts)

export type CatId = string;
export type HouseholdId = string;
export type LotId = string;
export type MemorialId = string;
export type PregnancyId = string;
export type EventId = string;
export type ObjectId = string;

export type LifeStage = 'kitten' | 'adolescent' | 'adult' | 'elder';
export type LifeStatus = 'living' | 'deceased' | 'moved_out';

export interface GridCell {
  x: number;
  y: number;
}

export interface CatPosition {
  lotId: LotId;
  x: number;
  y: number;
}

export interface CatAppearance {
  coatColor: string;
  coatPattern: string;
  eyeColor: string;
  expression?: string;
}

export type PersonalityTrait =
  | 'playful'
  | 'lazy'
  | 'glutton'
  | 'curious'
  | 'affectionate'
  | 'skittish'
  | 'vocal'
  | 'adventurous';

export interface CatNeeds {
  hunger: number; // 0..100
  energy: number; // 0..100
  hygiene: number; // 0..100
  social: number; // 0..100
  fun: number; // 0..100
  bladder: number; // 0..100
}

export interface CatSkills {
  hunting: number;
  climbing: number;
  socializing: number;
  charisma: number;
}

export interface ActionQueueItem {
  id: string;
  type: string;
  targetObjectId?: ObjectId;
  durationMinutes: number;
  remainingMinutes: number;
}

export interface FamilyTreeRef {
  sireId: CatId | null;
  damId: CatId | null;
  childIds: CatId[];
  generation: number;
}

export interface HealthStatus {
  isIll: boolean;
  illnessType?: string;
  illnessOnsetMinute?: number;
  hasActiveHazard: boolean;
  hazardType?: 'fire' | 'extreme_neglect' | 'severe_illness';
  hazardOnsetMinute?: number;
  warningIssued: boolean;
  warningIssuedAtMinute?: number;
}

export interface CatRecord {
  id: CatId;
  householdId: HouseholdId;
  name: string;
  appearance: CatAppearance;
  traits: PersonalityTrait[];
  lifeStage: LifeStage;
  ageDays: number;
  ageMinutes: number;
  lifeStatus: LifeStatus;
  needs: CatNeeds;
  skills: CatSkills;
  position: CatPosition;
  currentAction: ActionQueueItem | null;
  family: FamilyTreeRef;
  health?: HealthStatus;
  causeOfDeath?: string;
  deceasedAtSimMinute?: number;
  jobId?: string | null;
}

export interface PregnancyRecord {
  id: PregnancyId;
  damId: CatId;
  sireId: CatId;
  conceptionSimMinute: number;
  dueSimMinute: number;
  litterSize: number; // reserved slots (1..3)
  resolved: boolean;
}

export interface MemorialRecord {
  id: MemorialId;
  deceasedCatId: CatId;
  catName: string;
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
  deceasedCatId: CatId;
  name: string;
  appearance: CatAppearance;
  position: CatPosition;
  expiresAtSimMinute: number;
}

export interface SimClock {
  simMinute: number;
  isPaused: boolean;
  speed: 1;
}

export interface RngStateData {
  seed: number;
  counter: number;
  serializedState?: string;
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

export interface LifecycleSubsystemState {
  pregnancies: Record<PregnancyId, PregnancyRecord>;
  memorials: Record<MemorialId, MemorialRecord>;
  ghosts: GhostProjection[];
  lastGhostCheckNight?: number;
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
  building?: any;
  social?: any;
  economy?: any;
  neighborhood?: any;
  lifecycle: LifecycleSubsystemState;
  commandReceipts?: any[];
  events: DomainEvent[];
  nextEventSequence: number;
}

export interface CommandContext {
  actorId: string;
  commandId: string;
  timestamp?: number;
}

export type CommandResult =
  | { ok: true; state: WorldState; events: DomainEvent[] }
  | { ok: false; state: WorldState; error: { code: string; message: string } };

// Lifecycle Commands
export type LifecycleCommand =
  | { type: 'TRIGGER_BIRTH'; payload: { pregnancyId: PregnancyId; kittenNames?: string[] } }
  | { type: 'INTERVENE_HAZARD'; payload: { catId: CatId; treatmentType?: 'vet' | 'care' | 'extinguish' } }
  | { type: 'PLACE_MEMORIAL'; payload: { deceasedCatId: CatId; lotId: LotId; x: number; y: number } }
  | { type: 'DISMISS_GHOST'; payload: { memorialId: MemorialId } };

export type GameCommand = LifecycleCommand | { type: string; payload?: any };
