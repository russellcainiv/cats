export type LotId = string;
export type CatId = string;
export type HouseholdId = string;
export type ObjectId = string;
export type PregnancyId = string;
export type MemorialId = string;
export type GoalId = string;
export type EventId = string;

export interface CatAppearance {
  bodyColor: string;
  pattern?: string;
  eyeColor: string;
  collarColor?: string;
  accessory?: string;
}

export type PersonalityTrait =
  | 'playful'
  | 'lazy'
  | 'curious'
  | 'social'
  | 'skittish'
  | 'greedy'
  | 'adventurous'
  | 'affectionate';

export type LifeStage = 'kitten' | 'adolescent' | 'adult' | 'elder';
export type LifeStatus = 'living' | 'deceased' | 'ghost';
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
  hunting: number;
  agility: number;
  charm: number;
  crafting: number;
}

export interface GridCell {
  x: number;
  y: number;
}

export interface CatPosition {
  lotId: LotId;
  x: number;
  y: number;
}

export interface ActionQueueItem {
  type: string;
  targetLotId?: LotId;
  targetObjectId?: ObjectId;
  targetCatId?: CatId;
  durationMinutes: number;
  elapsedMinutes: number;
}

export interface NpcScheduleItem {
  startHour: number; // 0..23
  endHour: number;   // 0..23
  lotId: LotId;
  activity: string;
}

export interface CatRecord {
  id: CatId;
  name: string;
  appearance: CatAppearance;
  traits: PersonalityTrait[];
  lifeStage: LifeStage;
  ageDays: number;
  ageMinutes: number;
  lifeStatus: LifeStatus;
  needs: CatNeeds;
  moodScore: number;
  moodBand: MoodBand;
  skills: CatSkills;
  position: CatPosition;
  currentAction: ActionQueueItem | null;
  lastRoute: GridCell[];
  relationships: Record<CatId, { friendship: number; romance: number; isLove: boolean }>;
  isNpc: boolean;
  npcSchedule?: NpcScheduleItem[];
  homeLotId: LotId;
  familyTree?: {
    motherId?: CatId;
    fatherId?: CatId;
    partnerId?: CatId;
    offspringIds?: CatId[];
  };
  isPregnant?: boolean;
}

export interface TravelJourney {
  catId: CatId;
  originLotId: LotId;
  targetLotId: LotId;
  startSimMinute: number;
  durationMinutes: number;
  elapsedMinutes: number;
  isReturn: boolean;
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
  blockedCells: string[]; // "x,y" format
  walls: WallSegment[];
  doors: DoorItem[];
  objects: LotObject[];
  openingHour?: number; // e.g. 8 for 8 AM
  closingHour?: number; // e.g. 20 for 8 PM
  residentCatIds?: CatId[];
}

export interface ShopCatalogItem {
  catalogId: string;
  name: string;
  category: 'seating' | 'sleep' | 'care' | 'play' | 'skill' | 'decor' | 'food';
  price: number;
  stock: number;
}

export interface AdoptionCandidate {
  candidateId: string;
  name: string;
  appearance: CatAppearance;
  traits: PersonalityTrait[];
  lifeStage: LifeStage;
  adoptionFee: number;
  description: string;
}

export interface TransferredCatRecord {
  catId: CatId;
  originalHouseholdId: HouseholdId;
  transferredAtSimMinute: number;
  newHomeLotId: LotId;
}

export interface NeighborhoodSubsystemState {
  activeLotId: LotId;
  lots: Record<LotId, WorldLot>;
  npcCats: Record<CatId, CatRecord>;
  activeTravels: Record<CatId, TravelJourney>;
  shopInventory: ShopCatalogItem[];
  adoptionCandidates: AdoptionCandidate[];
  transferredCats: Record<CatId, TransferredCatRecord>;
}

// Global WorldState matching the shared engine contract
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

export interface SimClock {
  simMinute: number;
  isPaused: boolean;
  speed: 1;
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

export interface MemorialRecord {
  memorialId: MemorialId;
  catId: CatId;
  name: string;
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

export interface PregnancyRecord {
  pregnancyId: PregnancyId;
  motherId: CatId;
  fatherId: CatId;
  conceptionSimMinute: number;
  dueSimMinute: number;
  reservedLitterSlots: number;
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
    lots: Record<LotId, WorldLot>;
    activeFreeBuild: boolean;
  };
  social: {
    recentInteractions: Array<{ fromId: CatId; toId: CatId; type: string; simMinute: number }>;
  };
  economy: {
    wallet: Wallet;
    inventory: Record<string, InventoryItem>;
    careers: Record<string, unknown>;
    cafe: {
      owned: boolean;
      recipes: Array<{ id: string; name: string; cost: number; price: number; unlocked: boolean }>;
      supplies: Record<string, number>;
      dailyRevenue: number;
    };
    goals: Record<string, unknown>;
  };
  neighborhood: NeighborhoodSubsystemState;
  lifecycle: {
    pregnancies: Record<PregnancyId, PregnancyRecord>;
    memorials: Record<MemorialId, MemorialRecord>;
    ghosts: GhostProjection[];
  };
  commandReceipts: CommandReceipt[];
  events: DomainEvent[];
  nextEventSequence: number;
}

export type NeighborhoodCommand =
  | { type: 'TRAVEL_TO_LOT'; payload: { catId: CatId; targetLotId: LotId } }
  | { type: 'CANCEL_TRAVEL'; payload: { catId: CatId } }
  | { type: 'RETURN_HOME'; payload: { catId: CatId } }
  | { type: 'BUY_SHOP_ITEM'; payload: { catalogId: string; quantity: number } }
  | { type: 'ADOPT_CAT'; payload: { candidateId?: string; name: string; appearance: CatAppearance; traits: PersonalityTrait[] } }
  | { type: 'TRANSFER_CAT_TO_NEIGHBORHOOD'; payload: { catId: CatId; targetLotId: LotId } }
  | { type: 'VISIT_LOT'; payload: { catId: CatId; targetLotId: LotId } };

export interface CommandContext {
  actorId: string;
  commandId: string;
  timestamp?: number;
}

export type CommandResult =
  | { ok: true; state: WorldState; events: DomainEvent[] }
  | { ok: false; state: WorldState; error: { code: string; message: string } };
