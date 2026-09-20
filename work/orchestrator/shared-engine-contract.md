# Cats Game Engine Architecture & Integration Contract

## Status: Published by Engine Owner (AGY Gemini 3.8 Flash High)
**Date:** 2026-09-20  
**Target Worktrees / Peers:**
- Engine: `cats-engine` (Owner: AGY Gemini 3.8 Flash High)
- Foundation: `cats-foundation` (Owner: App/Server/Auth/Save integration)
- World UI: `cats-world` (Owner: PixiJS rendering, DOM HUD)
- Domain Subsystems: Jules (`src/domain/building/**`, `src/domain/social/**`, `src/domain/economy/**`, `src/domain/neighborhood/**`, `src/domain/lifecycle/**`)

---

## 1. Architectural Principles

1. **Deterministic Headless Simulation:**
   The simulation is fully headless, deterministic, and isolated from UI or network dependencies.
   `dispatch(state, command, context) -> CommandResult`
   `advance(state, elapsedSimMinutes) -> WorldState`
   `selectView(state) -> GameView`

2. **Single Immutable Authority:**
   All state updates return a new `WorldState`. The renderer and UI never mutate domain state directly; all user intentions flow as typed `GameCommand` objects.

3. **No Absent-Time Advance:**
   Simulation time only advances while the game is open and active. When paused, closed, or disconnected, zero simulation minutes elapse. Offline catch-up is strictly forbidden (R09).

4. **Hard Invariants (R20, R21, R22, R23):**
   - Maximum 8 living household cats (`livingCount + sum(reservedLitterSlots) <= 8`).
   - Death is permanent; deceased records exist as memorials; ghosts are non-resurrecting memorial projections.
   - Moo-Moo requires adult stage, mutual love (friendship/romance >= 70, love flag), alignment, willingness, and mood >= 60.
   - Declines emit a decline event and consume zero RNG rolls.
   - Conception has a single 25% roll on completed eligible Moo-Moo; litter size (1–3) is clamped to available capacity (`8 - living - reserved`) and reserved immediately. Retries never redraw.
   - Lifespan is fixed at 150 sim days (1 sim day = 24 real minutes / 1440 sim minutes); no adjustable lifespan.

---

## 2. Shared Types and Schema: `src/domain/state.ts`

```ts
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
  hunger: number;   // 0-100 (decay: 0.08 / min)
  hygiene: number;  // 0-100 (decay: 0.04 / min)
  energy: number;   // 0-100 (decay: 0.06 / min)
  comfort: number;  // 0-100 (decay: 0.03 / min)
  social: number;   // 0-100 (decay: 0.02 / min)
  fun: number;      // 0-100 (decay: 0.02 / min)
  health: number;   // 0-100 (decay: 0.01 / min on neglect/illness)
}

export type MoodBand = 'miserable' | 'low' | 'okay' | 'happy' | 'ecstatic';

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
  hunting: number;
  charisma: number;
  agility: number;
  creativity: number;
  tinkering: number;
}

export interface RelationshipRecord {
  targetCatId: CatId;
  friendship: number; // -100 to 100
  romance: number;    // 0 to 100
  isLove: boolean;
  lastInteractionMinute: number;
}

export interface CatRecord {
  id: CatId;
  householdId: HouseholdId;
  name: string;
  appearance: CatAppearance;
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
  blockedCells: string[]; // "x,y" format
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

// Subsystem states plugged into WorldState
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
```

---

## 3. Command Protocol: `src/domain/commands.ts`

```ts
export type GameCommand =
  // Core Commands (owned by engine)
  | { type: 'CREATE_CAT'; payload: { name: string; appearance: CatAppearance; traits: PersonalityTrait[] } }
  | { type: 'SELECT_CAT'; payload: { catId: CatId | null } }
  | { type: 'MOVE_CAT'; payload: { catId: CatId; target: GridCell } }
  | { type: 'CANCEL_ACTION'; payload: { catId: CatId } }
  | { type: 'DIRECT_CARE'; payload: { catId: CatId; actionType: 'eat' | 'sleep' | 'litter' | 'groom' | 'scratch' | 'play'; targetObjectId?: ObjectId } }
  | { type: 'SET_SIMULATION_PAUSE'; payload: { paused: boolean } }
  | { type: 'RENAME_HOUSEHOLD'; payload: { name: string } }
  | { type: 'ADOPT_CAT'; payload: { name: string; appearance: CatAppearance; traits: PersonalityTrait[] } }

  // Subsystem Commands (handled by subsystem reducers or core default handlers)
  // Building:
  | { type: 'BUILD_WALL'; payload: { lotId: LotId; x1: number; y1: number; x2: number; y2: number } }
  | { type: 'REMOVE_WALL'; payload: { lotId: LotId; wallId: string } }
  | { type: 'PLACE_OBJECT'; payload: { lotId: LotId; catalogId: string; x: number; y: number } }
  | { type: 'MOVE_OBJECT'; payload: { lotId: LotId; objectId: ObjectId; x: number; y: number } }
  | { type: 'REMOVE_OBJECT'; payload: { lotId: LotId; objectId: ObjectId } }
  | { type: 'ENTER_FREE_BUILD'; payload: Record<string, never> }
  | { type: 'COMMIT_FREE_BUILD'; payload: Record<string, never> }
  | { type: 'CANCEL_FREE_BUILD'; payload: Record<string, never> }

  // Social / Romance:
  | { type: 'SOCIAL_INTERACT'; payload: { initiatorId: CatId; targetId: CatId; interactionType: 'sniff' | 'nuzzle' | 'play_chase' | 'hiss' } }
  | { type: 'SUGGEST_MOO_MOO'; payload: { initiatorId: CatId; partnerId: CatId } }

  // Economy:
  | { type: 'BUY_ITEM'; payload: { catalogId: string; quantity: number } }
  | { type: 'SELL_ITEM'; payload: { itemId: string; quantity: number } }
  | { type: 'HARVEST_CROP'; payload: { gardenPlotId: ObjectId } }
  | { type: 'PLANT_CROP'; payload: { gardenPlotId: ObjectId; cropType: 'tomato' | 'strawberry' | 'catnip' } }
  | { type: 'RESTOCK_CAFE'; payload: { recipeId: string; amount: number } }

  // Neighborhood:
  | { type: 'TRAVEL_TO_LOT'; payload: { catId: CatId; targetLotId: LotId } }
  | { type: 'RETURN_HOME'; payload: { catId: CatId } }

  // Lifecycle:
  | { type: 'TRIGGER_BIRTH'; payload: { pregnancyId: PregnancyId } }
  | { type: 'INTERVENE_HAZARD'; payload: { catId: CatId } }
  | { type: 'PLACE_MEMORIAL'; payload: { deceasedCatId: CatId; lotId: LotId; x: number; y: number } }
  | { type: 'DISMISS_GHOST'; payload: { memorialId: MemorialId } };

export interface CommandContext {
  actorId: string;
  commandId: string;
  timestamp?: number;
}

export type CommandResult =
  | { ok: true; state: WorldState; events: DomainEvent[] }
  | { ok: false; state: WorldState; error: { code: string; message: string } };

export function dispatch(state: WorldState, command: GameCommand, context: CommandContext): CommandResult;
export function advance(state: WorldState, elapsedSimMinutes: number): WorldState;
export function selectView(state: WorldState): GameView;
```

---

## 4. UI View Projection: `src/domain/selectors.ts`

```ts
export interface CatView {
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
}

export interface LotView {
  id: LotId;
  name: string;
  type: string;
  width: number;
  height: number;
  blockedCells: string[];
  objects: LotObject[];
  walls: WallSegment[];
  doors: DoorItem[];
}

export interface WarningItem {
  catId: CatId;
  catName: string;
  type: 'health_danger' | 'extreme_need' | 'illness';
  message: string;
  severity: 'warning' | 'critical';
}

export interface GameView {
  household: {
    id: HouseholdId;
    name: string;
    livingCount: number;
    reservedLitterSlots: number;
    capacity: 8;
    mode: 'normal' | 'free-build-preview' | 'free-build-committed';
  };
  simulation: {
    isPaused: boolean;
    simMinute: number;
    day: number;
    hour: number;
    minute: number;
    statusText: string;
  };
  selectedCatId: CatId | null;
  selectedCat: CatView | null;
  cats: Record<CatId, CatView>;
  home: LotView;
  currentLot: LotView;
  wallet: Wallet;
  inventory: InventoryItem[];
  careers: CareerRecord[];
  goals: GoalRecord[];
  memorials: MemorialRecord[];
  ghosts: GhostProjection[];
  warnings: WarningItem[];
}
```

---

## 5. Subsystem Plugin Contract

Subsystems owned by Jules (`building`, `social`, `economy`, `neighborhood`, `lifecycle`) attach via pure functional reducers and tick handlers:

```ts
export interface SubsystemReducer<TSubState> {
  name: string;
  handleCommand?(subState: TSubState, worldState: WorldState, command: GameCommand, context: CommandContext): { state: TSubState; events?: DomainEvent[] } | null;
  advanceTick?(subState: TSubState, worldState: WorldState, elapsedMinutes: number): { state: TSubState; events?: DomainEvent[] };
}
```

The core provides built-in default handlers and initial state for all subsystems, ensuring complete standalone execution and testing even prior to peer integration. When peer implementations are imported, they plug into this exact typed contract.
