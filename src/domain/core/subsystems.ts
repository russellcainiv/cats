/**
 * Modular Subsystem Architecture & Typed Subsystem Reducers
 *
 * Implements decoupled, typed subsystem adapters conforming to parallel-contract.md:
 * - building: lot geometry, walls, objects, free-build modes, dynamic blocked cell recalculation
 * - social: cat relationships, mutual readiness, consent validation, Moo-Moo conception
 * - economy: items/inventory, catalog purchases, career outfits, shift departure/return
 * - neighborhood: lot travel and transfers
 * - lifecycle: pregnancy gestation, atomic birth, memorials, ghost projections
 */

import { SeededRng } from '../rng';
import {
  calculateAvailableCapacity,
  CareerOutfit,
  CareerRecord,
  CatAppearance,
  CatId,
  CatRecord,
  CommandContext,
  DomainEvent,
  DoorItem,
  GridCell,
  LifeStage,
  LotId,
  LotObject,
  MAX_LIVING_CATS_CAPACITY,
  MemorialId,
  MemorialRecord,
  ObjectId,
  PregnancyId,
  PregnancyRecord,
  WallSegment,
  WorldLot,
  WorldState,
} from '../state';
import { createCatRecord } from './cat';
import { createDomainEvent } from './events';
import { cellKey, recomputeBlockedCells } from './navigation';

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

// Typed subsystem command unions
export type BuildingCommand =
  | { type: 'BUILD_WALL'; payload: { lotId: LotId; x1: number; y1: number; x2: number; y2: number } }
  | { type: 'REMOVE_WALL'; payload: { lotId: LotId; wallId: string } }
  | { type: 'PLACE_OBJECT'; payload: { lotId: LotId; catalogId: string; x: number; y: number } }
  | { type: 'MOVE_OBJECT'; payload: { lotId: LotId; objectId: ObjectId; x: number; y: number } }
  | { type: 'REMOVE_OBJECT'; payload: { lotId: LotId; objectId: ObjectId } }
  | { type: 'ENTER_FREE_BUILD'; payload?: Record<string, never> }
  | { type: 'COMMIT_FREE_BUILD'; payload?: Record<string, never> }
  | { type: 'CANCEL_FREE_BUILD'; payload?: Record<string, never> };

export type SocialCommand =
  | {
      type: 'SOCIAL_INTERACT';
      payload: {
        initiatorId: CatId;
        targetId: CatId;
        interactionType: 'sniff' | 'nuzzle' | 'play_chase' | 'hiss';
      };
    }
  | { type: 'SUGGEST_MOO_MOO'; payload: { initiatorId: CatId; partnerId: CatId } }
  | { type: 'PROPOSE_MOO_MOO'; payload: { initiatorId: CatId; partnerId: CatId; source?: 'player' | 'autonomous' } }
  | { type: 'CANCEL_SOCIAL_ACTION'; payload: { catId: CatId } };

export type EconomyCommand =
  | { type: 'BUY_ITEM'; payload: { catalogId: string; quantity: number } }
  | { type: 'SELL_ITEM'; payload: { itemId: string; quantity: number } }
  | { type: 'HARVEST_CROP'; payload: { gardenPlotId: ObjectId } }
  | { type: 'PLANT_CROP'; payload: { gardenPlotId: ObjectId; cropType: 'tomato' | 'strawberry' | 'catnip' } }
  | { type: 'RESTOCK_CAFE'; payload: { recipeId: string; amount: number } };

export type NeighborhoodCommand =
  | { type: 'TRAVEL_TO_LOT'; payload: { catId: CatId; targetLotId: LotId } }
  | { type: 'RETURN_HOME'; payload: { catId: CatId } };

export type LifecycleCommand =
  | { type: 'TRIGGER_BIRTH'; payload: { pregnancyId: PregnancyId; kittenNames?: string[] } }
  | { type: 'INTERVENE_HAZARD'; payload: { catId: CatId; treatmentType?: 'vet' | 'care' | 'extinguish' } }
  | { type: 'PLACE_MEMORIAL'; payload: { deceasedCatId: CatId; lotId: LotId; x: number; y: number } }
  | { type: 'DISMISS_GHOST'; payload: { memorialId: MemorialId } };

export function isBuildingCommand(command: { type: string }): command is BuildingCommand {
  return [
    'BUILD_WALL',
    'REMOVE_WALL',
    'PLACE_OBJECT',
    'MOVE_OBJECT',
    'REMOVE_OBJECT',
    'ENTER_FREE_BUILD',
    'COMMIT_FREE_BUILD',
    'CANCEL_FREE_BUILD',
  ].includes(command.type);
}

export function isSocialCommand(command: { type: string }): command is SocialCommand {
  return ['SOCIAL_INTERACT', 'SUGGEST_MOO_MOO', 'PROPOSE_MOO_MOO', 'CANCEL_SOCIAL_ACTION'].includes(command.type);
}

export function isEconomyCommand(command: { type: string }): command is EconomyCommand {
  return ['BUY_ITEM', 'SELL_ITEM', 'HARVEST_CROP', 'PLANT_CROP', 'RESTOCK_CAFE'].includes(command.type);
}

export function isNeighborhoodCommand(command: { type: string }): command is NeighborhoodCommand {
  return ['TRAVEL_TO_LOT', 'RETURN_HOME'].includes(command.type);
}

export function isLifecycleCommand(command: { type: string }): command is LifecycleCommand {
  return ['TRIGGER_BIRTH', 'INTERVENE_HAZARD', 'PLACE_MEMORIAL', 'DISMISS_GHOST'].includes(command.type);
}

// ---------------------------------------------------------------------------
// 1. BUILDING SUBSYSTEM
// ---------------------------------------------------------------------------

export function reduceBuilding(
  state: WorldState,
  command: BuildingCommand,
  context: CommandContext,
  _rng: SeededRng
): CommandResult {
  switch (command.type) {
    case 'BUILD_WALL': {
      const { lotId, x1, y1, x2, y2 } = command.payload;
      const lot = state.building.lots[lotId];
      if (!lot) {
        return { ok: false, state, error: { code: 'LOT_NOT_FOUND', message: `Lot ${lotId} not found` } };
      }

      // Validate bounds
      if (
        x1 < 0 || x1 >= lot.width ||
        x2 < 0 || x2 >= lot.width ||
        y1 < 0 || y1 >= lot.height ||
        y2 < 0 || y2 >= lot.height
      ) {
        return {
          ok: false,
          state,
          error: { code: 'OUT_OF_BOUNDS', message: 'Wall coordinates exceed lot bounds' },
        };
      }

      // Walls must be orthogonal (horizontal or vertical)
      if (x1 !== x2 && y1 !== y2) {
        return {
          ok: false,
          state,
          error: { code: 'INVALID_WALL_GEOMETRY', message: 'Walls must be strictly horizontal or vertical' },
        };
      }

      const wallSeq = state.nextEventSequence;
      const wallId = `wall_${lotId}_${x1}_${y1}_${x2}_${y2}_${wallSeq}`;
      const wall: WallSegment = {
        id: wallId,
        x1,
        y1,
        x2,
        y2,
        provenance: state.building.activeFreeBuild ? 'free_build' : 'earned',
      };

      const updatedWalls = [...lot.walls, wall];
      const updatedBlockedCells = recomputeBlockedCells({
        walls: updatedWalls,
        objects: lot.objects,
        doors: lot.doors,
      });

      const updatedLot: WorldLot = {
        ...lot,
        walls: updatedWalls,
        blockedCells: updatedBlockedCells,
      };

      const nextEventSeq = state.nextEventSequence + 1;
      const nextState: WorldState = {
        ...state,
        building: {
          ...state.building,
          lots: { ...state.building.lots, [lotId]: updatedLot },
        },
        nextEventSequence: nextEventSeq,
      };

      const event = createDomainEvent(
        'WALL_BUILT',
        [context.actorId],
        { lotId, wallId, x1, y1, x2, y2 },
        state.clock.simMinute,
        wallSeq
      );

      return { ok: true, state: nextState, events: [event] };
    }

    case 'REMOVE_WALL': {
      const { lotId, wallId } = command.payload;
      const lot = state.building.lots[lotId];
      if (!lot) {
        return { ok: false, state, error: { code: 'LOT_NOT_FOUND', message: `Lot ${lotId} not found` } };
      }

      const existingWall = lot.walls.find((w) => w.id === wallId);
      if (!existingWall) {
        return { ok: false, state, error: { code: 'WALL_NOT_FOUND', message: `Wall ${wallId} not found` } };
      }

      const updatedWalls = lot.walls.filter((w) => w.id !== wallId);
      // Recompute blocked cells dynamically - prevents permanently blocked cell leaks!
      const updatedBlockedCells = recomputeBlockedCells({
        walls: updatedWalls,
        objects: lot.objects,
        doors: lot.doors,
      });

      const updatedLot: WorldLot = {
        ...lot,
        walls: updatedWalls,
        blockedCells: updatedBlockedCells,
      };

      const remSeq = state.nextEventSequence;
      const nextState: WorldState = {
        ...state,
        building: {
          ...state.building,
          lots: { ...state.building.lots, [lotId]: updatedLot },
        },
        nextEventSequence: remSeq + 1,
      };

      const event = createDomainEvent(
        'WALL_REMOVED',
        [context.actorId],
        { lotId, wallId },
        state.clock.simMinute,
        remSeq
      );

      return { ok: true, state: nextState, events: [event] };
    }

    case 'PLACE_OBJECT': {
      const { lotId, catalogId, x, y } = command.payload;
      const lot = state.building.lots[lotId];
      if (!lot) {
        return { ok: false, state, error: { code: 'LOT_NOT_FOUND', message: `Lot ${lotId} not found` } };
      }

      if (x < 0 || x >= lot.width || y < 0 || y >= lot.height) {
        return { ok: false, state, error: { code: 'OUT_OF_BOUNDS', message: 'Object coordinates out of bounds' } };
      }

      const objSeq = state.nextEventSequence;
      const objId = `obj_${catalogId}_${x}_${y}_${objSeq}`;
      const obj: LotObject = {
        id: objId,
        catalogId,
        name: catalogId.replace('furn_', '').replace(/_/g, ' '),
        category: 'decor',
        x,
        y,
        width: 1,
        height: 1,
        interactSpots: [{ x, y: Math.min(lot.height - 1, y + 1) }],
        provenance: state.building.activeFreeBuild ? 'free_build' : 'earned',
      };

      const updatedObjects = [...lot.objects, obj];
      const updatedBlockedCells = recomputeBlockedCells({
        walls: lot.walls,
        objects: updatedObjects,
        doors: lot.doors,
      });

      const updatedLot: WorldLot = {
        ...lot,
        objects: updatedObjects,
        blockedCells: updatedBlockedCells,
      };

      const nextState: WorldState = {
        ...state,
        building: {
          ...state.building,
          lots: { ...state.building.lots, [lotId]: updatedLot },
        },
        nextEventSequence: objSeq + 1,
      };

      const event = createDomainEvent(
        'OBJECT_PLACED',
        [context.actorId],
        { lotId, objectId: objId, catalogId, x, y },
        state.clock.simMinute,
        objSeq
      );

      return { ok: true, state: nextState, events: [event] };
    }

    case 'ENTER_FREE_BUILD': {
      const evtSeq = state.nextEventSequence;
      const nextState: WorldState = {
        ...state,
        building: {
          ...state.building,
          activeFreeBuild: true,
        },
        economy: {
          ...state.economy,
          wallet: {
            ...state.economy.wallet,
            mode: 'free-build-preview',
          },
        },
        nextEventSequence: evtSeq + 1,
      };

      const event = createDomainEvent(
        'FREE_BUILD_ENTERED',
        [context.actorId],
        {},
        state.clock.simMinute,
        evtSeq
      );
      return { ok: true, state: nextState, events: [event] };
    }

    case 'COMMIT_FREE_BUILD': {
      const evtSeq = state.nextEventSequence;
      const nextState: WorldState = {
        ...state,
        building: {
          ...state.building,
          activeFreeBuild: false,
        },
        economy: {
          ...state.economy,
          wallet: {
            ...state.economy.wallet,
            mode: 'normal',
          },
        },
        nextEventSequence: evtSeq + 1,
      };

      const event = createDomainEvent(
        'FREE_BUILD_COMMITTED',
        [context.actorId],
        {},
        state.clock.simMinute,
        evtSeq
      );
      return { ok: true, state: nextState, events: [event] };
    }

    case 'CANCEL_FREE_BUILD': {
      const evtSeq = state.nextEventSequence;
      // Revert any free_build objects and walls
      const revertedLots: Record<LotId, WorldLot> = {};
      for (const [id, lot] of Object.entries(state.building.lots)) {
        const walls = lot.walls.filter((w) => w.provenance !== 'free_build');
        const objects = lot.objects.filter((o) => o.provenance !== 'free_build');
        const blockedCells = recomputeBlockedCells({ walls, objects, doors: lot.doors });
        revertedLots[id] = {
          ...lot,
          walls,
          objects,
          blockedCells,
        };
      }

      const nextState: WorldState = {
        ...state,
        building: {
          ...state.building,
          lots: revertedLots,
          activeFreeBuild: false,
        },
        economy: {
          ...state.economy,
          wallet: {
            ...state.economy.wallet,
            mode: 'normal',
          },
        },
        nextEventSequence: evtSeq + 1,
      };

      const event = createDomainEvent(
        'FREE_BUILD_CANCELLED',
        [context.actorId],
        {},
        state.clock.simMinute,
        evtSeq
      );
      return { ok: true, state: nextState, events: [event] };
    }

    case 'MOVE_OBJECT':
    case 'REMOVE_OBJECT':
    default:
      return {
        ok: false,
        state,
        error: {
          code: 'COMMAND_NOT_SUPPORTED',
          message: `Building command ${command.type} is not supported pending building module integration`,
        },
      };
  }
}

export function advanceBuilding(state: WorldState, _elapsedSimMinutes: number): WorldState {
  return state;
}

// ---------------------------------------------------------------------------
// 2. SOCIAL SUBSYSTEM
// ---------------------------------------------------------------------------

export function reduceSocial(
  state: WorldState,
  command: SocialCommand,
  context: CommandContext,
  rng: SeededRng
): CommandResult {
  switch (command.type) {
    case 'SUGGEST_MOO_MOO':
    case 'PROPOSE_MOO_MOO': {
      const { initiatorId, partnerId } = command.payload;
      const initiator = state.cats[initiatorId];
      const partner = state.cats[partnerId];

      if (!initiator || !partner || initiator.lifeStatus !== 'living' || partner.lifeStatus !== 'living') {
        return {
          ok: false,
          state,
          error: { code: 'CAT_NOT_FOUND', message: 'Initiator or partner cat not found or deceased' },
        };
      }

      if (initiator.position.lotId !== partner.position.lotId) {
        return {
          ok: false,
          state,
          error: { code: 'DIFFERENT_LOTS', message: 'Cats must be on the same lot for Moo-Moo' },
        };
      }

      const isAdults = initiator.lifeStage === 'adult' && partner.lifeStage === 'adult';
      const rel1 = initiator.relationships[partnerId];
      const rel2 = partner.relationships[initiatorId];
      const mutualLove = Boolean(rel1?.isLove && rel2?.isLove && rel1.romance >= 70 && rel2.romance >= 70);

      const initiatorInMood =
        initiator.moodScore >= 60 &&
        initiator.needs.energy >= 35 &&
        initiator.needs.social >= 35 &&
        initiator.needs.health > 40 &&
        !initiator.pregnancyId;

      const partnerInMood =
        partner.moodScore >= 60 &&
        partner.needs.energy >= 35 &&
        partner.needs.social >= 35 &&
        partner.needs.health > 40 &&
        !partner.pregnancyId;

      const eligible = isAdults && mutualLove && initiatorInMood && partnerInMood;

      if (!eligible) {
        // Declined: consumes ZERO random rolls per contract rule
        const declineSeq = state.nextEventSequence;
        const declineEvent = createDomainEvent(
          'MOO_MOO_DECLINED',
          [initiatorId, partnerId],
          {
            reason: !isAdults
              ? 'Must be adult cats'
              : !mutualLove
              ? 'Requires mutual love'
              : 'Partner or initiator not in the mood',
          },
          state.clock.simMinute,
          declineSeq
        );
        return {
          ok: true,
          state: { ...state, nextEventSequence: declineSeq + 1 },
          events: [declineEvent],
        };
      }

      // Mutual consent accepted
      const startSeq = state.nextEventSequence;
      let nextSeq = startSeq + 1;
      const startEvent = createDomainEvent(
        'MOO_MOO_COMPLETED',
        [initiatorId, partnerId],
        { success: true },
        state.clock.simMinute,
        startSeq
      );

      const events: DomainEvent[] = [startEvent];

      // Update needs and interaction timestamps identically to autonomous Moo-Moo
      const relInit = initiator.relationships[partnerId];
      const relPart = partner.relationships[initiatorId];

      const updatedInitiator: CatRecord = {
        ...initiator,
        needs: {
          ...initiator.needs,
          social: 100,
          comfort: Math.min(100, initiator.needs.comfort + 20),
          energy: Math.max(0, initiator.needs.energy - 15),
        },
        relationships: {
          ...initiator.relationships,
          [partnerId]: {
            ...(relInit ?? { targetCatId: partnerId, friendship: 0, romance: 0, isLove: false, lastInteractionMinute: 0 }),
            lastInteractionMinute: state.clock.simMinute,
          },
        },
      };

      let updatedPartner: CatRecord = {
        ...partner,
        needs: {
          ...partner.needs,
          social: 100,
          comfort: Math.min(100, partner.needs.comfort + 20),
          energy: Math.max(0, partner.needs.energy - 15),
        },
        relationships: {
          ...partner.relationships,
          [initiatorId]: {
            ...(relPart ?? { targetCatId: initiatorId, friendship: 0, romance: 0, isLove: false, lastInteractionMinute: 0 }),
            lastInteractionMinute: state.clock.simMinute,
          },
        },
      };

      let nextState: WorldState = {
        ...state,
        cats: {
          ...state.cats,
          [initiatorId]: updatedInitiator,
          [partnerId]: updatedPartner,
        },
      };

      const availableCapacity = calculateAvailableCapacity(state);

      if (availableCapacity > 0) {
        // Exactly ONE 25% conception draw (R19)
        const conceived = rng.drawBool(0.25, 'moo_moo_conception', state.clock.simMinute);
        if (conceived) {
          const rawLitterSize = rng.drawInt(1, 3, 'moo_moo_litter_size', state.clock.simMinute);
          const reservedSlots = Math.min(rawLitterSize, availableCapacity);

          // Deterministic pregnancy ID using parent IDs and sim minute (no Date.now/Math.random)
          const pregnancyId = `preg_${initiatorId}_${partnerId}_${state.clock.simMinute}`;
          const pregnancy: PregnancyRecord = {
            id: pregnancyId,
            parentIds: [initiatorId, partnerId],
            startedAtSimMinute: state.clock.simMinute,
            dueAtSimMinute: state.clock.simMinute + 4320, // 3 sim days
            reservedSlots,
            conceptionEventId: startEvent.id,
          };

          updatedPartner = { ...updatedPartner, pregnancyId };
          nextState = {
            ...nextState,
            cats: {
              ...nextState.cats,
              [partnerId]: updatedPartner,
            },
            lifecycle: {
              ...nextState.lifecycle,
              pregnancies: {
                ...nextState.lifecycle.pregnancies,
                [pregnancyId]: pregnancy,
              },
            },
          };

          const pregEvent = createDomainEvent(
            'PREGNANCY_STARTED',
            [partnerId, initiatorId],
            { pregnancyId, reservedSlots, dueAtSimMinute: pregnancy.dueAtSimMinute },
            state.clock.simMinute,
            nextSeq++,
            'moo_moo_conception'
          );
          events.push(pregEvent);
        }
      } else {
        // Capacity full: Moo-Moo is successful romance, but zero conception rolls are performed
        const capEvent = createDomainEvent(
          'MOO_MOO_AT_CAPACITY',
          [initiatorId, partnerId],
          { message: 'Household capacity reached (8 living/reserved). No kittens possible.' },
          state.clock.simMinute,
          nextSeq++
        );
        events.push(capEvent);
      }

      nextState.nextEventSequence = nextSeq;
      return { ok: true, state: nextState, events };
    }

    case 'SOCIAL_INTERACT': {
      const { initiatorId, targetId, interactionType } = command.payload;
      const initiator = state.cats[initiatorId];
      const target = state.cats[targetId];

      if (!initiator || !target || initiator.lifeStatus !== 'living' || target.lifeStatus !== 'living') {
        return {
          ok: false,
          state,
          error: { code: 'CAT_NOT_FOUND', message: 'Initiator or target cat not found or deceased' },
        };
      }

      const rel1 = initiator.relationships[targetId] || {
        targetCatId: targetId,
        friendship: 0,
        romance: 0,
        isLove: false,
        lastInteractionMinute: state.clock.simMinute,
      };

      const rel2 = target.relationships[initiatorId] || {
        targetCatId: initiatorId,
        friendship: 0,
        romance: 0,
        isLove: false,
        lastInteractionMinute: state.clock.simMinute,
      };

      let deltaF = 0;
      let deltaR = 0;
      switch (interactionType) {
        case 'sniff':
          deltaF = 5;
          break;
        case 'nuzzle':
          deltaF = 10;
          deltaR = 8;
          break;
        case 'play_chase':
          deltaF = 15;
          break;
        case 'hiss':
          deltaF = -20;
          deltaR = -10;
          break;
      }

      const newF1 = Math.max(-100, Math.min(100, rel1.friendship + deltaF));
      const newR1 = Math.max(0, Math.min(100, rel1.romance + deltaR));
      const newF2 = Math.max(-100, Math.min(100, rel2.friendship + deltaF));
      const newR2 = Math.max(0, Math.min(100, rel2.romance + deltaR));

      const isLove = newF1 >= 70 && newR1 >= 70 && newF2 >= 70 && newR2 >= 70;

      const evtSeq = state.nextEventSequence;
      const nextState: WorldState = {
        ...state,
        cats: {
          ...state.cats,
          [initiatorId]: {
            ...initiator,
            relationships: {
              ...initiator.relationships,
              [targetId]: { ...rel1, friendship: newF1, romance: newR1, isLove, lastInteractionMinute: state.clock.simMinute },
            },
          },
          [targetId]: {
            ...target,
            relationships: {
              ...target.relationships,
              [initiatorId]: { ...rel2, friendship: newF2, romance: newR2, isLove, lastInteractionMinute: state.clock.simMinute },
            },
          },
        },
        social: {
          ...state.social,
          recentInteractions: [
            ...state.social.recentInteractions,
            { fromId: initiatorId, toId: targetId, type: interactionType, simMinute: state.clock.simMinute },
          ].slice(-50),
        },
        nextEventSequence: evtSeq + 1,
      };

      const event = createDomainEvent(
        'CAT_SOCIAL_INTERACTED',
        [initiatorId, targetId],
        { interactionType, friendshipDelta: deltaF, romanceDelta: deltaR },
        state.clock.simMinute,
        evtSeq
      );

      return { ok: true, state: nextState, events: [event] };
    }

    case 'CANCEL_SOCIAL_ACTION':
    default:
      return {
        ok: false,
        state,
        error: {
          code: 'COMMAND_NOT_SUPPORTED',
          message: `Social command ${command.type} is not supported pending social module integration`,
        },
      };
  }
}

export function advanceSocial(state: WorldState, _elapsedSimMinutes: number): WorldState {
  return state;
}

// ---------------------------------------------------------------------------
// 3. ECONOMY SUBSYSTEM
// ---------------------------------------------------------------------------

export function getCareerOutfit(careerId: string, rank: number): CareerOutfit {
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

export function reduceEconomy(
  state: WorldState,
  command: EconomyCommand,
  context: CommandContext,
  _rng: SeededRng
): CommandResult {
  switch (command.type) {
    case 'BUY_ITEM': {
      const { catalogId, quantity } = command.payload;

      // Strict validation: non-negative, non-zero, positive integer
      if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
        return {
          ok: false,
          state,
          error: { code: 'INVALID_QUANTITY', message: 'Quantity must be a positive integer greater than zero' },
        };
      }

      const unitCost = 20; // Default unit price
      const totalCost = unitCost * quantity;

      if (state.economy.wallet.earnedCash < totalCost) {
        return {
          ok: false,
          state,
          error: {
            code: 'INSUFFICIENT_FUNDS',
            message: `Insufficient funds: requires $${totalCost} but wallet only has $${state.economy.wallet.earnedCash}`,
          },
        };
      }

      const itemSeq = state.nextEventSequence;
      const itemId = `inv_${catalogId}_${itemSeq}`;
      const existing = state.economy.inventory[catalogId];
      const newQuantity = existing ? existing.quantity + quantity : quantity;

      const nextState: WorldState = {
        ...state,
        economy: {
          ...state.economy,
          wallet: {
            ...state.economy.wallet,
            earnedCash: state.economy.wallet.earnedCash - totalCost,
          },
          inventory: {
            ...state.economy.inventory,
            [catalogId]: {
              id: existing ? existing.id : itemId,
              catalogId,
              quantity: newQuantity,
              provenance: 'earned',
            },
          },
        },
        nextEventSequence: itemSeq + 1,
      };

      const event = createDomainEvent(
        'ITEM_BOUGHT',
        [context.actorId],
        { catalogId, quantity, totalCost },
        state.clock.simMinute,
        itemSeq
      );

      return { ok: true, state: nextState, events: [event] };
    }

    case 'SELL_ITEM':
    case 'HARVEST_CROP':
    case 'PLANT_CROP':
    case 'RESTOCK_CAFE':
    default:
      return {
        ok: false,
        state,
        error: {
          code: 'COMMAND_NOT_SUPPORTED',
          message: `Economy command ${command.type} is not supported pending economy module integration`,
        },
      };
  }
}

/**
 * Advances economy simulation hooks:
 * Manages career shifts, work outfit application on departure, and base appearance restoration on return.
 */
export function advanceEconomy(state: WorldState, _elapsedSimMinutes: number): WorldState {
  const currentMinute = state.clock.simMinute;
  const hourOfDay = Math.floor((currentMinute % 1440) / 60);
  const dayOfWeek = Math.floor(currentMinute / 1440) % 7;

  let hasUpdates = false;
  const updatedCats = { ...state.cats };
  const updatedCareers = { ...state.economy.careers };
  const newEvents: DomainEvent[] = [];
  let nextSeq = state.nextEventSequence;
  let earnedCashDelta = 0;

  for (const [catId, career] of Object.entries(state.economy.careers)) {
    const cat = updatedCats[catId];
    if (!cat || cat.lifeStatus !== 'living') continue;

    const isWorkDay = career.workDays.includes(dayOfWeek);
    const isShiftHour =
      career.shiftStartHour <= career.shiftEndHour
        ? hourOfDay >= career.shiftStartHour && hourOfDay < career.shiftEndHour
        : hourOfDay >= career.shiftStartHour || hourOfDay < career.shiftEndHour;
    const isShiftTime = isWorkDay && isShiftHour;

    // Shift departure
    if (isShiftTime && !cat.isAtWork) {
      hasUpdates = true;
      const outfit = getCareerOutfit(career.careerId, career.rank);
      // Preserve base appearance prior to applying career outfit
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

      newEvents.push(
        createDomainEvent(
          'CAT_DEPARTED_FOR_WORK',
          [catId],
          { careerId: career.careerId, rank: career.rank, outfitId: outfit.outfitId },
          currentMinute,
          nextSeq++
        )
      );
    } else if (!isShiftTime && cat.isAtWork) {
      // Shift return: restore normal cat appearance
      hasUpdates = true;
      const restoredAppearance = cat.baseAppearance ? { ...cat.baseAppearance } : { ...cat.appearance };

      updatedCats[catId] = {
        ...cat,
        appearance: restoredAppearance,
        careerOutfit: null,
        isAtWork: false,
      };

      const dailyWage = career.rank * 35;
      earnedCashDelta += dailyWage;

      updatedCareers[catId] = {
        ...career,
        isAtWork: false,
      };

      newEvents.push(
        createDomainEvent(
          'CAT_RETURNED_FROM_WORK',
          [catId],
          { careerId: career.careerId, rank: career.rank, earnedWage: dailyWage },
          currentMinute,
          nextSeq++
        )
      );
    }
  }

  if (!hasUpdates) {
    return state;
  }

  return {
    ...state,
    cats: updatedCats,
    economy: {
      ...state.economy,
      wallet: {
        ...state.economy.wallet,
        earnedCash: state.economy.wallet.earnedCash + earnedCashDelta,
      },
      careers: updatedCareers,
    },
    events: [...state.events, ...newEvents].slice(-128),
    nextEventSequence: nextSeq,
  };
}

// ---------------------------------------------------------------------------
// 4. NEIGHBORHOOD SUBSYSTEM
// ---------------------------------------------------------------------------

export function reduceNeighborhood(
  state: WorldState,
  command: NeighborhoodCommand,
  _context: CommandContext,
  _rng: SeededRng
): CommandResult {
  return {
    ok: false,
    state,
    error: {
      code: 'COMMAND_NOT_SUPPORTED',
      message: `Neighborhood command ${command.type} is not supported pending neighborhood module integration`,
    },
  };
}

export function advanceNeighborhood(state: WorldState, _elapsedSimMinutes: number): WorldState {
  return state;
}

// ---------------------------------------------------------------------------
// 5. LIFECYCLE SUBSYSTEM
// ---------------------------------------------------------------------------

export function reduceLifecycle(
  state: WorldState,
  command: LifecycleCommand,
  _context: CommandContext,
  _rng: SeededRng
): CommandResult {
  switch (command.type) {
    case 'TRIGGER_BIRTH': {
      const { pregnancyId } = command.payload;
      const preg = state.lifecycle.pregnancies[pregnancyId];
      if (!preg) {
        return { ok: false, state, error: { code: 'PREGNANCY_NOT_FOUND', message: 'Pregnancy not found' } };
      }

      const mother = state.cats[preg.parentIds[0]] || state.cats[preg.parentIds[1]];
      const father = state.cats[preg.parentIds[1]] || state.cats[preg.parentIds[0]];
      const kittenCount = preg.reservedSlots;

      const livingIds = [...state.livingCatIds];
      const catsMap = { ...state.cats };
      const events: DomainEvent[] = [];
      let nextSeq = state.nextEventSequence;

      for (let i = 0; i < kittenCount; i++) {
        if (livingIds.length >= MAX_LIVING_CATS_CAPACITY) break;
        // Deterministic kitten ID
        const kittenId = `cat_kitten_${state.clock.simMinute}_${i}`;
        const kittenName = command.payload.kittenNames?.[i] || `Kitten ${i + 1}`;

        // Genetic appearance inheritance from mother and father
        const inheritedBreed = mother?.appearance.breed || father?.appearance.breed || 'domestic_shorthair';
        const primaryColor = i % 2 === 0 ? mother?.appearance.primaryColor || '#F5E6D3' : father?.appearance.primaryColor || '#333333';
        const secondaryColor = father?.appearance.secondaryColor || mother?.appearance.secondaryColor;
        const pattern = mother?.appearance.pattern || 'solid';
        const eyeColor = i % 2 === 0 ? mother?.appearance.eyeColor || 'blue' : father?.appearance.eyeColor || 'green';

        // Offset position to avoid stacking directly on the mother
        const motherPos = mother?.position || { lotId: 'home', x: 4, y: 4, facing: 'south' as const };
        const kittenPos = {
          lotId: motherPos.lotId,
          x: Math.max(0, motherPos.x + ((i % 2 === 0 ? 1 : -1) * (Math.floor(i / 2) + 1))),
          y: motherPos.y,
          facing: 'south' as const,
        };

        const kitten = createCatRecord({
          id: kittenId,
          householdId: state.householdId,
          name: kittenName,
          appearance: {
            breed: inheritedBreed,
            primaryColor,
            secondaryColor,
            pattern,
            eyeColor,
            bodyType: 'petite',
          },
          traits: ['playful', 'curious'],
          lifeStage: 'kitten',
          ageMinutes: 0,
          position: kittenPos,
          createdAtSimMinute: state.clock.simMinute,
          motherId: preg.parentIds[0],
          fatherId: preg.parentIds[1],
        });

        catsMap[kittenId] = kitten;
        livingIds.push(kittenId);

        events.push(
          createDomainEvent(
            'KITTEN_BORN',
            [kittenId, preg.parentIds[0], preg.parentIds[1]],
            { kittenId, name: kitten.name },
            state.clock.simMinute,
            nextSeq++
          )
        );
      }

      const pregnancies = { ...state.lifecycle.pregnancies };
      delete pregnancies[pregnancyId];

      for (const parentId of preg.parentIds) {
        if (catsMap[parentId] && catsMap[parentId].pregnancyId === pregnancyId) {
          catsMap[parentId] = { ...catsMap[parentId], pregnancyId: undefined };
        }
      }

      const nextState: WorldState = {
        ...state,
        livingCatIds: livingIds,
        cats: catsMap,
        lifecycle: {
          ...state.lifecycle,
          pregnancies,
        },
        nextEventSequence: nextSeq,
      };

      return { ok: true, state: nextState, events };
    }

    case 'INTERVENE_HAZARD':
    case 'PLACE_MEMORIAL':
    case 'DISMISS_GHOST':
    default:
      return {
        ok: false,
        state,
        error: {
          code: 'COMMAND_NOT_SUPPORTED',
          message: `Lifecycle command ${command.type} is not supported pending lifecycle module integration`,
        },
      };
  }
}

export function advanceLifecycle(state: WorldState, _elapsedSimMinutes: number): WorldState {
  return state;
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
    const res = reduceBuilding(state, command, context, rng);
    return res.ok
      ? { state: res.state, events: res.events, handled: true }
      : { state, events: [], handled: true, error: res.error };
  }

  if (isSocialCommand(command)) {
    const res = reduceSocial(state, command, context, rng);
    return res.ok
      ? { state: res.state, events: res.events, handled: true }
      : { state, events: [], handled: true, error: res.error };
  }

  if (isEconomyCommand(command)) {
    const res = reduceEconomy(state, command, context, rng);
    return res.ok
      ? { state: res.state, events: res.events, handled: true }
      : { state, events: [], handled: true, error: res.error };
  }

  if (isNeighborhoodCommand(command)) {
    const res = reduceNeighborhood(state, command, context, rng);
    return res.ok
      ? { state: res.state, events: res.events, handled: true }
      : { state, events: [], handled: true, error: res.error };
  }

  if (isLifecycleCommand(command)) {
    const res = reduceLifecycle(state, command, context, rng);
    return res.ok
      ? { state: res.state, events: res.events, handled: true }
      : { state, events: [], handled: true, error: res.error };
  }

  return { state, events: [], handled: false };
}
