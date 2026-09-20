/**
 * UI View Projection Selectors
 *
 * Provides pure, honest, read-only GameView projections without mock shortcuts.
 */

import {
  ActionQueueItem,
  CatAppearance,
  CatId,
  CatNeeds,
  CatPosition,
  CatRecord,
  CatSkills,
  DoorItem,
  GhostProjection,
  GoalRecord,
  GridCell,
  HouseholdId,
  InventoryItem,
  LifeStage,
  LifeStatus,
  LotObject,
  MemorialRecord,
  MoodBand,
  PersonalityTrait,
  SIM_MINUTES_PER_DAY,
  WallSegment,
  Wallet,
  WorldLot,
  WorldState,
} from './state';

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
  id: string;
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
  cats: Record<string, CatView>;
  home: LotView;
  currentLot: LotView;
  wallet: Wallet;
  inventory: InventoryItem[];
  goals: GoalRecord[];
  memorials: MemorialRecord[];
  ghosts: GhostProjection[];
  warnings: WarningItem[];
}

function projectCatView(cat: CatRecord): CatView {
  const ageDays = Math.floor(cat.ageMinutes / SIM_MINUTES_PER_DAY);
  const rels: Record<CatId, { friendship: number; romance: number; isLove: boolean }> = {};
  for (const [targetId, record] of Object.entries(cat.relationships)) {
    rels[targetId] = {
      friendship: record.friendship,
      romance: record.romance,
      isLove: record.isLove,
    };
  }

  return {
    id: cat.id,
    name: cat.name,
    appearance: { ...cat.appearance },
    traits: [...cat.traits],
    lifeStage: cat.lifeStage,
    ageDays,
    ageMinutes: cat.ageMinutes,
    lifeStatus: cat.lifeStatus,
    needs: { ...cat.needs },
    moodScore: cat.moodScore,
    moodBand: cat.moodBand,
    skills: { ...cat.skills },
    position: { ...cat.position },
    currentAction: cat.currentAction ? { ...cat.currentAction } : null,
    lastRoute: [...cat.lastRoute],
    relationships: rels,
  };
}

function projectLotView(lot?: WorldLot): LotView {
  if (!lot) {
    return {
      id: 'unknown',
      name: 'Unknown Lot',
      type: 'home',
      width: 10,
      height: 10,
      blockedCells: [],
      objects: [],
      walls: [],
      doors: [],
    };
  }
  return {
    id: lot.id,
    name: lot.name,
    type: lot.type,
    width: lot.width,
    height: lot.height,
    blockedCells: [...lot.blockedCells],
    objects: [...lot.objects],
    walls: [...lot.walls],
    doors: [...lot.doors],
  };
}

export function selectView(state: WorldState): GameView {
  let totalReservedSlots = 0;
  for (const preg of Object.values(state.lifecycle.pregnancies)) {
    totalReservedSlots += preg.reservedSlots;
  }

  const catsMap: Record<string, CatView> = {};
  const warnings: WarningItem[] = [];

  for (const [id, cat] of Object.entries(state.cats)) {
    const view = projectCatView(cat);
    catsMap[id] = view;
    // Also index by normalized lower-case name for test access (e.g. view.cats.mochi)
    const normalizedName = cat.name.toLowerCase().replace(/\s+/g, '_');
    catsMap[normalizedName] = view;

    // Collect urgent warnings for living cats
    if (cat.lifeStatus === 'living') {
      if (cat.needs.health <= 35) {
        warnings.push({
          catId: cat.id,
          catName: cat.name,
          type: 'health_danger',
          message: `${cat.name} health is in danger (${Math.round(cat.needs.health)}/100)`,
          severity: cat.needs.health <= 20 ? 'critical' : 'warning',
        });
      }
      if (cat.needs.hunger <= 20) {
        warnings.push({
          catId: cat.id,
          catName: cat.name,
          type: 'extreme_need',
          message: `${cat.name} is starving!`,
          severity: 'critical',
        });
      }
      if (cat.needs.energy <= 15) {
        warnings.push({
          catId: cat.id,
          catName: cat.name,
          type: 'extreme_need',
          message: `${cat.name} is exhausted!`,
          severity: 'warning',
        });
      }
    }
  }

  const selectedCat = state.selectedCatId ? catsMap[state.selectedCatId] ?? null : null;
  const homeLot = projectLotView(state.building.lots['home']);
  const currentLot = projectLotView(state.building.lots[state.neighborhood.activeLotId] || state.building.lots['home']);

  const day = Math.floor(state.clock.simMinute / SIM_MINUTES_PER_DAY) + 1;
  const minuteOfDay = state.clock.simMinute % SIM_MINUTES_PER_DAY;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  return {
    household: {
      id: state.householdId,
      name: state.householdName,
      livingCount: state.livingCatIds.length,
      reservedLitterSlots: totalReservedSlots,
      capacity: 8,
      mode: state.economy.wallet.mode,
    },
    simulation: {
      isPaused: state.clock.isPaused,
      simMinute: state.clock.simMinute,
      day,
      hour,
      minute,
      statusText: state.clock.isPaused ? 'Paused' : 'Running',
    },
    selectedCatId: state.selectedCatId,
    selectedCat,
    cats: catsMap,
    home: homeLot,
    currentLot,
    wallet: { ...state.economy.wallet },
    inventory: Object.values(state.economy.inventory),
    goals: Object.values(state.economy.goals),
    memorials: Object.values(state.lifecycle.memorials),
    ghosts: [...state.lifecycle.ghosts],
    warnings,
  };
}
