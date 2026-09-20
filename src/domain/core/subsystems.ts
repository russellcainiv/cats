/**
 * Modular Subsystem Architecture & Typed Subsystem Reducers
 *
 * Integrates the REAL domain subsystem modules:
 * - building: lot geometry, walls, doors, windows, finishes, furniture, free-build, undo/redo
 * - social: relationships, mutual readiness, consent validation, in-progress Moo-Moo actions, conception
 * - economy: careers (3 careers, 3 ranks), outfits, hobbies (painting/gardening), cafe, goals (18 evaluators), wallet
 * - neighborhood: 7 lots, 8 persistent NPCs, travel, shop, adoption, adult transfers
 * - lifecycle: pregnancy gestation, atomic birth, memorials, ghost projections
 */

import {
  reduceBuilding as reduceBuildingModule,
  advanceBuilding as advanceBuildingModule,
  isBuildingCommand as isBuildingModuleCommand,
  BuildingCommand as BuildingModuleCommand,
} from '../building';

import {
  reduceSocial as reduceSocialModule,
  advanceSocial as advanceSocialModule,
  isSocialCommand as isSocialModuleCommand,
  SocialCommand as SocialModuleCommand,
} from '../social';

import {
  reduceEconomy as reduceEconomyModule,
  advanceEconomy as advanceEconomyModule,
  isEconomyCommand as isEconomyModuleCommand,
  EconomyCommand as EconomyModuleCommand,
} from '../economy';

import {
  reduceNeighborhood as reduceNeighborhoodModule,
  advanceNeighborhood as advanceNeighborhoodModule,
  isNeighborhoodCommand as isNeighborhoodModuleCommand,
  NeighborhoodCommand as NeighborhoodModuleCommand,
} from '../neighborhood';

import {
  reduceLifecycle as reduceLifecycleModule,
  advanceLifecycle as advanceLifecycleModule,
  isLifecycleCommand as isLifecycleModuleCommand,
  LifecycleCommand as LifecycleModuleCommand,
} from '../lifecycle';

import { SeededRng } from '../rng';
import {
  CatId,
  CommandContext,
  CareerOutfit,
  DomainEvent,
  LotId,
  MemorialId,
  ObjectId,
  PregnancyId,
  WorldState,
} from '../state';

export interface CommandResultSuccess {
  ok: true;
  state: WorldState;
  events: DomainEvent[];
}

export interface CommandResultFailure {
  ok: false;
  state: WorldState;
  error: { code: string; message: string };
}

export type CommandResult = CommandResultSuccess | CommandResultFailure;

// Re-export or compose typed subsystem command unions
export type BuildingCommand =
  | BuildingModuleCommand
  | { type: 'PLACE_OBJECT'; payload: { lotId: LotId; catalogId: string; x: number; y: number; rotation?: 0 | 90 | 180 | 270; colorVariant?: string } }
  | { type: 'REMOVE_OBJECT'; payload: { lotId: LotId; objectId: ObjectId } }
  | { type: 'UNDO_BUILD'; payload: { lotId: LotId } }
  | { type: 'REDO_BUILD'; payload: { lotId: LotId } }
  | { type: 'DISCARD_FREE_BUILD'; payload?: Record<string, never> };

export type SocialCommand = SocialModuleCommand;

export type EconomyCommand =
  | EconomyModuleCommand
  | { type: 'HARVEST_CROP'; payload: { gardenPlotId: ObjectId } }
  | { type: 'PLANT_CROP'; payload: { gardenPlotId: ObjectId; cropType: 'tomato' | 'strawberry' | 'catnip' } };

export type NeighborhoodCommand = NeighborhoodModuleCommand;

export type LifecycleCommand = LifecycleModuleCommand;

export function isBuildingCommand(command: { type: string }): command is BuildingCommand {
  if (!command || typeof command !== 'object') return false;
  return (
    command.type === 'PLACE_OBJECT' ||
    command.type === 'REMOVE_OBJECT' ||
    command.type === 'UNDO_BUILD' ||
    command.type === 'REDO_BUILD' ||
    command.type === 'DISCARD_FREE_BUILD' ||
    isBuildingModuleCommand(command)
  );
}

export function isSocialCommand(command: { type: string }): command is SocialCommand {
  return isSocialModuleCommand(command);
}

export function isEconomyCommand(command: { type: string }): command is EconomyCommand {
  return isEconomyModuleCommand(command);
}

export function isNeighborhoodCommand(command: { type: string }): command is NeighborhoodCommand {
  return isNeighborhoodModuleCommand(command);
}

export function isLifecycleCommand(command: { type: string }): command is LifecycleCommand {
  return isLifecycleModuleCommand(command as any);
}

// ---------------------------------------------------------------------------
// 1. BUILDING SUBSYSTEM
// ---------------------------------------------------------------------------

export function reduceBuilding(
  state: WorldState,
  command: BuildingCommand,
  context: CommandContext,
  _rng?: SeededRng
): CommandResult {
  let normalizedCmd: any = command;
  if (command.type === 'PLACE_OBJECT') {
    normalizedCmd = {
      type: 'BUY_AND_PLACE_OBJECT',
      payload: {
        lotId: command.payload.lotId,
        catalogId: command.payload.catalogId,
        x: command.payload.x,
        y: command.payload.y,
        rotation: (command.payload as any).rotation,
        colorVariant: (command.payload as any).colorVariant,
      },
    };
  } else if (command.type === 'REMOVE_OBJECT') {
    normalizedCmd = {
      type: 'SELL_OBJECT',
      payload: {
        lotId: command.payload.lotId,
        objectId: command.payload.objectId,
      },
    };
  } else if (command.type === 'UNDO_BUILD') {
    normalizedCmd = {
      type: 'UNDO_BUILD_ACTION',
      payload: { lotId: command.payload.lotId },
    };
  } else if (command.type === 'REDO_BUILD') {
    normalizedCmd = {
      type: 'REDO_BUILD_ACTION',
      payload: { lotId: command.payload.lotId },
    };
  } else if (command.type === 'DISCARD_FREE_BUILD') {
    normalizedCmd = {
      type: 'CANCEL_FREE_BUILD',
      payload: command.payload,
    };
  }

  return (reduceBuildingModule(state as any, normalizedCmd as any, context) as unknown) as CommandResult;
}

export function advanceBuilding(state: WorldState, elapsedSimMinutes: number): WorldState {
  if (!state.building) return state;
  return (advanceBuildingModule(state as any, elapsedSimMinutes) as unknown) as WorldState;
}

// ---------------------------------------------------------------------------
// 2. SOCIAL SUBSYSTEM
// ---------------------------------------------------------------------------

export function reduceSocial(
  state: WorldState,
  command: SocialCommand,
  context: CommandContext,
  _rng?: SeededRng
): CommandResult {
  return (reduceSocialModule(state as any, command as any, context) as unknown) as CommandResult;
}

export function advanceSocial(state: WorldState, elapsedSimMinutes: number): WorldState {
  if (!state.social) return state;
  return (advanceSocialModule(state as any, elapsedSimMinutes) as unknown) as WorldState;
}

// ---------------------------------------------------------------------------
// 3. ECONOMY SUBSYSTEM
// ---------------------------------------------------------------------------

export function reduceEconomy(
  state: WorldState,
  command: EconomyCommand,
  context: CommandContext,
  _rng?: SeededRng
): CommandResult {
  let normalizedCmd: any = command;
  if (command.type === 'PLANT_CROP' && (command.payload as any)?.gardenPlotId && !(command.payload as any)?.plotObjectId) {
    normalizedCmd = {
      ...command,
      payload: {
        ...command.payload,
        plotObjectId: (command.payload as any).gardenPlotId,
      },
    };
  } else if (command.type === 'HARVEST_CROP' && (command.payload as any)?.gardenPlotId && !(command.payload as any)?.plotObjectId) {
    normalizedCmd = {
      ...command,
      payload: {
        ...command.payload,
        plotObjectId: (command.payload as any).gardenPlotId,
      },
    };
  }

  return (reduceEconomyModule(state as any, normalizedCmd, context) as unknown) as CommandResult;
}

export function getCareerOutfit(careerId: string, rank: number = 1): CareerOutfit {
  switch (careerId) {
    case 'cafe_assistant':
      return {
        outfitId: rank === 1 ? 'outfit_cafe_apron_green' : rank === 2 ? 'outfit_cafe_barista_black' : 'outfit_cafe_manager_gold',
        careerId,
        rank,
      };
    case 'garden_keeper':
      return {
        outfitId: rank === 1 ? 'outfit_garden_strawhat' : rank === 2 ? 'outfit_garden_overalls' : 'outfit_garden_master',
        careerId,
        rank,
      };
    case 'gallery_helper':
    default:
      return {
        outfitId: rank === 1 ? 'outfit_gallery_beret' : rank === 2 ? 'outfit_gallery_smock' : 'outfit_gallery_curator',
        careerId,
        rank,
      };
  }
}

export function advanceEconomy(state: WorldState, elapsedSimMinutes: number): WorldState {
  let next = (advanceEconomyModule(state as any, elapsedSimMinutes) as unknown) as WorldState;

  if (next.economy?.careers) {
    const simMinute = next.clock.simMinute;
    const hourOfDay = Math.floor((simMinute % 1440) / 60);
    const dayOfWeek = Math.floor(simMinute / 1440) % 7;
    const updatedCats = { ...next.cats };
    const updatedCareers = { ...next.economy.careers };
    let hasUpdates = false;
    let earnedCashDelta = 0;

    for (const [catId, career] of Object.entries(next.economy.careers)) {
      const cat = updatedCats[catId];
      if (!cat || cat.lifeStatus !== 'living') continue;

      const isWorkDay = career.workDays.includes(dayOfWeek);
      const isShiftHour =
        career.shiftStartHour <= career.shiftEndHour
          ? hourOfDay >= career.shiftStartHour && hourOfDay < career.shiftEndHour
          : hourOfDay >= career.shiftStartHour || hourOfDay < career.shiftEndHour;
      const isShiftTime = isWorkDay && isShiftHour;

      if (isShiftTime && !cat.isAtWork) {
        hasUpdates = true;
        const outfit = getCareerOutfit(career.careerId, career.rank);
        const baseAppearance = cat.careerOutfit ? { ...cat.baseAppearance } : { ...cat.appearance };

        updatedCats[catId] = {
          ...cat,
          appearance: {
            ...cat.appearance,
            accessoryId: outfit.outfitId,
          },
          baseAppearance,
          careerOutfit: outfit,
          isAtWork: true,
        };
        updatedCareers[catId] = {
          ...career,
          isAtWork: true,
        };
      } else if (!isShiftTime && cat.isAtWork) {
        hasUpdates = true;
        const baseAppearance = cat.baseAppearance || { ...cat.appearance };
        const hoursWorked = Math.max(1, career.shiftEndHour - career.shiftStartHour);
        const dailyWage = hoursWorked * (career.hourlyWage || 15);
        earnedCashDelta += dailyWage;

        updatedCats[catId] = {
          ...cat,
          appearance: { ...baseAppearance },
          careerOutfit: null,
          isAtWork: false,
        };
        updatedCareers[catId] = {
          ...career,
          isAtWork: false,
        };
      }
    }

    if (hasUpdates) {
      next = {
        ...next,
        cats: updatedCats,
        economy: {
          ...next.economy,
          careers: updatedCareers,
          wallet: {
            ...next.economy.wallet,
            earnedCash: next.economy.wallet.earnedCash + earnedCashDelta,
          },
        },
      };
    }
  }

  return next;
}

// ---------------------------------------------------------------------------
// 4. NEIGHBORHOOD SUBSYSTEM
// ---------------------------------------------------------------------------

export function reduceNeighborhood(
  state: WorldState,
  command: NeighborhoodCommand,
  context: CommandContext,
  _rng?: SeededRng
): CommandResult {
  return (reduceNeighborhoodModule(state as any, command as any, context) as unknown) as CommandResult;
}

export function advanceNeighborhood(state: WorldState, elapsedSimMinutes: number): WorldState {
  if (!state.neighborhood) return state;
  return (advanceNeighborhoodModule(state as any, elapsedSimMinutes) as unknown) as WorldState;
}

// ---------------------------------------------------------------------------
// 5. LIFECYCLE SUBSYSTEM
// ---------------------------------------------------------------------------

export function reduceLifecycle(
  state: WorldState,
  command: LifecycleCommand,
  context: CommandContext,
  _rng?: SeededRng
): CommandResult {
  return (reduceLifecycleModule(state as any, command as any, context) as unknown) as CommandResult;
}

export function advanceLifecycle(state: WorldState, elapsedSimMinutes: number): WorldState {
  if (!state.lifecycle) return state;
  return (advanceLifecycleModule(state as any, elapsedSimMinutes) as unknown) as WorldState;
}

// ---------------------------------------------------------------------------
// Unified Subsystem Router
// ---------------------------------------------------------------------------

export interface SubsystemHandlerResult {
  state: WorldState;
  events: DomainEvent[];
  handled: boolean;
  error?: { code: string; message: string };
}

export function handleSubsystemCommand(
  state: WorldState,
  command: { type: string; payload?: any },
  context: CommandContext,
  rng: SeededRng
): SubsystemHandlerResult {
  if (isBuildingCommand(command)) {
    const res = reduceBuilding(state, command as any, context, rng);
    return res.ok
      ? { state: res.state, events: res.events || [], handled: true }
      : { state, events: [], handled: true, error: res.error };
  }

  if (isSocialCommand(command)) {
    const res = reduceSocial(state, command as any, context, rng);
    if (!res.ok) {
      const declineEvent = res.state?.events?.find((e: any) => e.type === 'MOO_MOO_DECLINED');
      return {
        state: res.state || state,
        events: declineEvent ? [declineEvent] : [],
        handled: true,
        error: res.error,
      };
    }
    return { state: res.state, events: res.events || [], handled: true };
  }

  if (isEconomyCommand(command)) {
    const res = reduceEconomy(state, command as any, context, rng);
    return res.ok
      ? { state: res.state, events: res.events || [], handled: true }
      : { state, events: [], handled: true, error: res.error };
  }

  if (isNeighborhoodCommand(command)) {
    const res = reduceNeighborhood(state, command as any, context, rng);
    return res.ok
      ? { state: res.state, events: res.events || [], handled: true }
      : { state, events: [], handled: true, error: res.error };
  }

  if (isLifecycleCommand(command)) {
    const res = reduceLifecycle(state, command as any, context, rng);
    return res.ok
      ? { state: res.state, events: res.events || [], handled: true }
      : { state, events: [], handled: true, error: res.error };
  }

  return { state, events: [], handled: false };
}
