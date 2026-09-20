// src/domain/social/types.ts
// Core domain interfaces and social subsystem extensions.

export type CatId = string;
export type LotId = string;
export type ObjectId = string;
export type PregnancyId = string;
export type MemorialId = string;
export type HouseholdId = string;
export type EventId = string;

export type PersonalityTrait =
  | 'playful'
  | 'lazy'
  | 'affectionate'
  | 'loner'
  | 'curious'
  | 'dramatic'
  | 'gentle'
  | 'feisty';

export type LifeStage = 'kitten' | 'adolescent' | 'adult' | 'elder';
export type LifeStatus = 'living' | 'deceased' | 'moved_out';
export type MoodBand = 'miserable' | 'low' | 'okay' | 'happy' | 'ecstatic';

export interface CatNeeds {
  hunger: number;
  hygiene: number;
  energy: number;
  comfort: number;
  social: number;
  fun: number;
  health: number;
}

export interface CatSkills {
  painting: number;
  gardening: number;
  cooking: number;
  social: number;
}

export interface CatPosition {
  lotId: LotId;
  x: number;
  y: number;
}

export interface CatAppearance {
  breed?: string;
  primaryColor: string;
  secondaryColor?: string;
  pattern?: 'solid' | 'tabby' | 'bicolor' | 'calico' | 'tortoiseshell' | 'pointed' | string;
  eyeColor: string;
  bodyType?: 'petite' | 'average' | 'stocky' | 'fluffy' | string;
  collarColor?: string;
  accessoryId?: string;
  // Compatibility fields
  coatStyle?: string;
  hasBow?: boolean;
  hasCollar?: boolean;
  coatColor?: string;
  coatPattern?: string;
}

export interface ActionQueueItem {
  id: string;
  type: string;
  targetId?: string;
  targetCatId?: string;
  targetPosition?: CatPosition;
  durationMinutes?: number;
  totalMinutes?: number;
  elapsedMinutes?: number;
  progressMinutes?: number;
  isInterruptible?: boolean;
  interruptible?: boolean;
  autonomous?: boolean;
  source?: 'player' | 'autonomous';
  payload?: Record<string, unknown>;
}

export interface CareerOutfit {
  outfitId: string;
  careerId: string;
  rank: number;
}

export interface CatRecord {
  id: CatId;
  name: string;
  appearance: CatAppearance;
  baseAppearance?: CatAppearance;
  careerOutfit?: CareerOutfit | null;
  traits: PersonalityTrait[];
  lifeStage: LifeStage;
  ageMinutes: number;
  lifeStatus: LifeStatus;
  householdId: HouseholdId;
  needs: CatNeeds;
  skills: CatSkills;
  position: CatPosition;
  currentAction: ActionQueueItem | null;
  actionQueue?: ActionQueueItem[];
  lastRoute?: any[];
  moodScore?: number;
  moodBand?: MoodBand;
  relationships?: Record<CatId, any>;
  motherId?: CatId;
  fatherId?: CatId;
  pregnancyId?: PregnancyId;
  isPregnant?: boolean;
  isWorking?: boolean;
  isAtWork?: boolean;
  isIll?: boolean;
  family?: {
    sireId: CatId | null;
    damId: CatId | null;
    childIds: CatId[];
    generation: number;
  };
  ageDays?: number;
}

export interface PregnancyRecord {
  id: PregnancyId;
  parentIds: [CatId, CatId]; // [gestatingCatId, otherParentId]
  startedAtSimMinute: number;
  dueAtSimMinute: number;
  reservedSlots: number;
  conceptionEventId: string;
  // Compatibility fields
  motherId?: CatId;
  fatherId?: CatId;
  damId?: CatId;
  sireId?: CatId;
  conceptionSimMinute?: number;
  conceivedAtSimMinute?: number;
  dueSimMinute?: number;
  litterSize?: number;
  resolved?: boolean;
  rngSeedAtConception?: number;
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

export interface CommandReceipt {
  commandId: string;
  simMinute: number;
  actorId: string;
  type: string;
  success: boolean;
  receiptChecksum: string;
}

// Social Subsystem Specific State Extensions
export type InteractionType =
  | 'sniff'
  | 'nuzzle'
  | 'play_chase'
  | 'hiss'
  | 'chat'
  | 'groom_other'
  | 'share_treat'
  | 'moo_moo';

export interface SocialRelationship {
  friendship: number; // -100 to 100
  romance: number;    // 0 to 100
  isLove: boolean;
  isRival: boolean;
  isFriend: boolean;
  interactionCount: number;
  lastInteractionSimMinute: number;
}

export interface SocialMemory {
  id: string;
  otherCatId: CatId;
  type: 'first_kiss' | 'argument' | 'moo_moo_completed' | 'became_friends' | 'became_rivals' | 'play_session';
  summary: string;
  simMinute: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface InProgressSocialAction {
  id: string;
  type: 'moo_moo' | 'social_interaction';
  interactionType?: InteractionType;
  initiatorId: CatId;
  targetId: CatId;
  startSimMinute: number;
  totalDurationMinutes: number;
  elapsedMinutes: number;
  source: 'player' | 'autonomous';
  completed?: boolean;
}

export interface SocialSubsystemState {
  recentInteractions: Array<{ fromId: CatId; toId: CatId; type: string; simMinute: number }>;
  relationships: Record<string, SocialRelationship>; // Keyed by `${catA}:${catB}`
  memories: Record<CatId, SocialMemory[]>;            // Keyed by CatId (bounded e.g. max 20 per cat)
  inProgressActions: InProgressSocialAction[];
  pairCooldowns: Record<string, number>;               // Keyed by `${catA}:${catB}`, value is simMinute when available
  completedActionIds: string[];                        // Completion identities for idempotency
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
  building: {
    lots: Record<LotId, unknown>;
    activeFreeBuild: boolean;
  };
  social: SocialSubsystemState;
  economy: {
    wallet: { earnedCash: number; freeBuildCash: number; mode: string };
    inventory: Record<string, unknown>;
    careers: Record<CatId, unknown>;
    cafe: unknown;
    goals: Record<string, unknown>;
  };
  neighborhood: {
    activeLotId: LotId;
    npcCats: Record<CatId, CatRecord>;
  };
  lifecycle: {
    pregnancies: Record<PregnancyId, PregnancyRecord>;
    memorials: Record<MemorialId, unknown>;
    ghosts: unknown[];
  };
  commandReceipts: CommandReceipt[];
  events: DomainEvent[];
  nextEventSequence: number;
}

// Command Definitions
export type SocialCommand =
  | {
      type: 'SOCIAL_INTERACT';
      payload: {
        initiatorId: CatId;
        targetId: CatId;
        interactionType: InteractionType;
        source?: 'player' | 'autonomous';
      };
    }
  | {
      type: 'SUGGEST_MOO_MOO';
      payload: {
        initiatorId: CatId;
        partnerId: CatId;
      };
    }
  | {
      type: 'PROPOSE_MOO_MOO';
      payload: {
        initiatorId: CatId;
        partnerId: CatId;
        source?: 'player' | 'autonomous';
      };
    }
  | {
      type: 'CANCEL_SOCIAL_ACTION';
      payload: {
        catId: CatId;
      };
    };

export interface CommandContext {
  actorId: string;
  commandId: string;
  timestamp?: number;
}

export type CommandResult =
  | { ok: true; state: WorldState; events: DomainEvent[] }
  | { ok: false; state: WorldState; error: { code: string; message: string } };
