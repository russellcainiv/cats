/**
 * Modular Subsystem Architecture & Default Reducer Implementations
 *
 * Implements clean decoupled plugin interfaces and robust default reducers
 * for building, social, economy, neighborhood, and lifecycle.
 */

import { SeededRng } from '../rng';
import {
  calculateAvailableCapacity,
  CatRecord,
  CommandContext,
  DomainEvent,
  DoorItem,
  LifeStage,
  LotObject,
  MAX_LIVING_CATS_CAPACITY,
  MemorialRecord,
  PregnancyRecord,
  WallSegment,
  WorldLot,
  WorldState,
} from '../state';
import { createCatRecord } from './cat';
import { createDomainEvent } from './events';
import { cellKey } from './navigation';

export interface SubsystemHandlerResult {
  state: WorldState;
  events: DomainEvent[];
  handled: boolean;
  error?: { code: string; message: string };
}

// Subsystem command processing
export function handleSubsystemCommand(
  state: WorldState,
  command: { type: string; payload: any },
  context: CommandContext,
  rng: SeededRng
): SubsystemHandlerResult {
  switch (command.type) {
    // --- BUILDING ---
    case 'BUILD_WALL': {
      const { lotId, x1, y1, x2, y2 } = command.payload;
      const lot = state.building.lots[lotId];
      if (!lot) return { state, events: [], handled: true, error: { code: 'LOT_NOT_FOUND', message: 'Lot not found' } };

      const wallId = `wall_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const wall: WallSegment = {
        id: wallId,
        x1,
        y1,
        x2,
        y2,
        provenance: state.building.activeFreeBuild ? 'free_build' : 'earned',
      };

      const updatedWalls = [...lot.walls, wall];
      const blockedSet = new Set(lot.blockedCells);
      // Mark line as blocked
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          blockedSet.add(cellKey(x, y));
        }
      }

      const updatedLot: WorldLot = {
        ...lot,
        walls: updatedWalls,
        blockedCells: Array.from(blockedSet),
      };

      const nextState: WorldState = {
        ...state,
        building: {
          ...state.building,
          lots: { ...state.building.lots, [lotId]: updatedLot },
        },
      };

      const event = createDomainEvent(
        'WALL_BUILT',
        [context.actorId],
        { lotId, wallId, x1, y1, x2, y2 },
        state.clock.simMinute,
        state.nextEventSequence++
      );

      return { state: nextState, events: [event], handled: true };
    }

    case 'REMOVE_WALL': {
      const { lotId, wallId } = command.payload;
      const lot = state.building.lots[lotId];
      if (!lot) return { state, events: [], handled: true, error: { code: 'LOT_NOT_FOUND', message: 'Lot not found' } };

      const updatedWalls = lot.walls.filter((w) => w.id !== wallId);
      const updatedLot: WorldLot = { ...lot, walls: updatedWalls };

      const nextState: WorldState = {
        ...state,
        building: {
          ...state.building,
          lots: { ...state.building.lots, [lotId]: updatedLot },
        },
      };

      const event = createDomainEvent(
        'WALL_REMOVED',
        [context.actorId],
        { lotId, wallId },
        state.clock.simMinute,
        state.nextEventSequence++
      );

      return { state: nextState, events: [event], handled: true };
    }

    case 'PLACE_OBJECT': {
      const { lotId, catalogId, x, y } = command.payload;
      const lot = state.building.lots[lotId];
      if (!lot) return { state, events: [], handled: true, error: { code: 'LOT_NOT_FOUND', message: 'Lot not found' } };

      const objId = `obj_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const obj: LotObject = {
        id: objId,
        catalogId,
        name: catalogId.replace('furn_', '').replace('_', ' '),
        category: 'decor',
        x,
        y,
        width: 1,
        height: 1,
        interactSpots: [{ x, y: y + 1 }],
        provenance: state.building.activeFreeBuild ? 'free_build' : 'earned',
      };

      const blockedSet = new Set(lot.blockedCells);
      blockedSet.add(cellKey(x, y));

      const updatedLot: WorldLot = {
        ...lot,
        objects: [...lot.objects, obj],
        blockedCells: Array.from(blockedSet),
      };

      const nextState: WorldState = {
        ...state,
        building: {
          ...state.building,
          lots: { ...state.building.lots, [lotId]: updatedLot },
        },
      };

      const event = createDomainEvent(
        'OBJECT_PLACED',
        [context.actorId],
        { lotId, objId, catalogId, x, y },
        state.clock.simMinute,
        state.nextEventSequence++
      );

      return { state: nextState, events: [event], handled: true };
    }

    case 'ENTER_FREE_BUILD': {
      const nextState: WorldState = {
        ...state,
        building: { ...state.building, activeFreeBuild: true },
        economy: {
          ...state.economy,
          wallet: { ...state.economy.wallet, mode: 'free-build-preview' },
        },
      };
      return { state: nextState, events: [], handled: true };
    }

    case 'COMMIT_FREE_BUILD': {
      const nextState: WorldState = {
        ...state,
        building: { ...state.building, activeFreeBuild: false },
        economy: {
          ...state.economy,
          wallet: { ...state.economy.wallet, mode: 'normal' },
        },
      };
      return { state: nextState, events: [], handled: true };
    }

    case 'CANCEL_FREE_BUILD': {
      const nextState: WorldState = {
        ...state,
        building: { ...state.building, activeFreeBuild: false },
        economy: {
          ...state.economy,
          wallet: { ...state.economy.wallet, mode: 'normal' },
        },
      };
      return { state: nextState, events: [], handled: true };
    }

    // --- SOCIAL / ROMANCE (R16, R17, R18, R19, R20, R21) ---
    case 'SOCIAL_INTERACT': {
      const { initiatorId, targetId, interactionType } = command.payload;
      const initiator = state.cats[initiatorId];
      const target = state.cats[targetId];
      if (!initiator || !target) {
        return { state, events: [], handled: true, error: { code: 'CAT_NOT_FOUND', message: 'Cat not found' } };
      }

      const rel = initiator.relationships[targetId] || {
        targetCatId: targetId,
        friendship: 0,
        romance: 0,
        isLove: false,
        lastInteractionMinute: state.clock.simMinute,
      };

      const boost = interactionType === 'hiss' ? -15 : 10;
      const updatedRel = {
        ...rel,
        friendship: Math.max(-100, Math.min(100, rel.friendship + boost)),
        lastInteractionMinute: state.clock.simMinute,
      };

      const nextInitiator = {
        ...initiator,
        relationships: { ...initiator.relationships, [targetId]: updatedRel },
      };

      const nextState: WorldState = {
        ...state,
        cats: { ...state.cats, [initiatorId]: nextInitiator },
      };

      const event = createDomainEvent(
        'SOCIAL_INTERACTION',
        [initiatorId, targetId],
        { interactionType, newFriendship: updatedRel.friendship },
        state.clock.simMinute,
        state.nextEventSequence++
      );

      return { state: nextState, events: [event], handled: true };
    }

    case 'SUGGEST_MOO_MOO': {
      const { initiatorId, partnerId } = command.payload;
      const initiator = state.cats[initiatorId];
      const partner = state.cats[partnerId];

      if (!initiator || !partner) {
        return { state, events: [], handled: true, error: { code: 'CAT_NOT_FOUND', message: 'Cats not found' } };
      }

      // Check criteria:
      // 1. Must be adults
      const isAdults = initiator.lifeStage === 'adult' && partner.lifeStage === 'adult';
      // 2. Mutual love: relationship score >= 70 and mutual love flag
      const rel1 = initiator.relationships[partnerId];
      const rel2 = partner.relationships[initiatorId];
      const mutualLove =
        rel1 &&
        rel2 &&
        rel1.isLove &&
        rel2.isLove &&
        rel1.romance >= 70 &&
        rel2.romance >= 70;

      // 3. In the mood: mood >= 60, energy >= 35, social >= 35, neither sick, neither currently pregnant
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
        // DECLINED!
        // CRITICAL CONTRACT RULE: "declined proposal consumes zero RNG rolls"
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
          state.nextEventSequence++
        );
        return { state, events: [declineEvent], handled: true };
      }

      // Mutual consent accepted!
      const startEvent = createDomainEvent(
        'MOO_MOO_COMPLETED',
        [initiatorId, partnerId],
        { success: true },
        state.clock.simMinute,
        state.nextEventSequence++
      );

      const events: DomainEvent[] = [startEvent];
      let nextState = { ...state };

      // Capacity calculation: available = 8 - livingCount - sum(reservedSlots)
      const availableCapacity = calculateAvailableCapacity(state);

      if (availableCapacity > 0) {
        // Exactly ONE 25% conception draw (R19)
        const conceived = rng.drawBool(0.25, 'moo_moo_conception', state.clock.simMinute);
        if (conceived) {
          // Draw litter size 1-3, clamped to available capacity
          const rawLitterSize = rng.drawInt(1, 3, 'moo_moo_litter_size', state.clock.simMinute);
          const reservedSlots = Math.min(rawLitterSize, availableCapacity);

          const pregnancyId = `preg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const pregnancy: PregnancyRecord = {
            id: pregnancyId,
            parentIds: [initiatorId, partnerId],
            startedAtSimMinute: state.clock.simMinute,
            dueAtSimMinute: state.clock.simMinute + 4320, // 3 sim days
            reservedSlots,
            conceptionEventId: startEvent.id,
          };

          nextState = {
            ...nextState,
            cats: {
              ...nextState.cats,
              [partnerId]: { ...partner, pregnancyId },
            },
            lifecycle: {
              ...nextState.lifecycle,
              pregnancies: {
                ...nextState.lifecycle.pregnancies,
                [pregnancyId]: pregnancy,
              },
            },
          };

          events.push(
            createDomainEvent(
              'PREGNANCY_STARTED',
              [partnerId, initiatorId],
              { pregnancyId, reservedSlots, dueAtSimMinute: pregnancy.dueAtSimMinute },
              state.clock.simMinute,
              state.nextEventSequence++,
              'moo_moo_conception'
            )
          );
        }
      } else {
        // At capacity: Moo-Moo is romantic and valid, but NO pregnancy roll is performed (R21)
        events.push(
          createDomainEvent(
            'MOO_MOO_AT_CAPACITY',
            [initiatorId, partnerId],
            { message: 'Household capacity reached (8 living/reserved). No kittens possible.' },
            state.clock.simMinute,
            state.nextEventSequence++
          )
        );
      }

      return { state: nextState, events, handled: true };
    }

    // --- LIFECYCLE (R20, R22, R23) ---
    case 'TRIGGER_BIRTH': {
      const { pregnancyId } = command.payload;
      const preg = state.lifecycle.pregnancies[pregnancyId];
      if (!preg) {
        return { state, events: [], handled: true, error: { code: 'PREGNANCY_NOT_FOUND', message: 'Pregnancy not found' } };
      }

      const events: DomainEvent[] = [];
      const newLivingIds = [...state.livingCatIds];
      const newCats = { ...state.cats };

      // Check how many kittens to create (up to reservedSlots, respecting max 8)
      const slots = preg.reservedSlots;
      const mother = state.cats[preg.parentIds[0]] || state.cats[preg.parentIds[1]];

      for (let i = 0; i < slots; i++) {
        if (newLivingIds.length >= MAX_LIVING_CATS_CAPACITY) break;
        const kittenId = `cat_kitten_${Date.now()}_${i}`;
        const kitten = createCatRecord({
          id: kittenId,
          householdId: state.householdId,
          name: `Kitten ${i + 1}`,
          appearance: mother ? { ...mother.appearance } : {
            breed: 'domestic_shorthair',
            primaryColor: '#F5E6D3',
            pattern: 'solid',
            eyeColor: 'blue',
            bodyType: 'petite',
          },
          traits: ['playful', 'curious'],
          lifeStage: 'kitten',
          ageMinutes: 0,
          position: mother ? { ...mother.position } : { lotId: 'home', x: 4, y: 4, facing: 'south' },
          createdAtSimMinute: state.clock.simMinute,
          motherId: preg.parentIds[0],
          fatherId: preg.parentIds[1],
        });

        newCats[kittenId] = kitten;
        newLivingIds.push(kittenId);

        events.push(
          createDomainEvent(
            'KITTEN_BORN',
            [kittenId, preg.parentIds[0], preg.parentIds[1]],
            { kittenId, name: kitten.name },
            state.clock.simMinute,
            state.nextEventSequence++
          )
        );
      }

      // Clear pregnancy and clear mother's pregnancy reference
      const nextPregnancies = { ...state.lifecycle.pregnancies };
      delete nextPregnancies[pregnancyId];

      for (const parentId of preg.parentIds) {
        if (newCats[parentId] && newCats[parentId].pregnancyId === pregnancyId) {
          newCats[parentId] = { ...newCats[parentId], pregnancyId: undefined };
        }
      }

      const nextState: WorldState = {
        ...state,
        livingCatIds: newLivingIds,
        cats: newCats,
        lifecycle: {
          ...state.lifecycle,
          pregnancies: nextPregnancies,
        },
      };

      return { state: nextState, events, handled: true };
    }

    case 'INTERVENE_HAZARD': {
      const { catId } = command.payload;
      const cat = state.cats[catId];
      if (!cat) return { state, events: [], handled: true, error: { code: 'CAT_NOT_FOUND', message: 'Cat not found' } };

      const updatedCat: CatRecord = {
        ...cat,
        needs: { ...cat.needs, health: 80, hunger: Math.max(50, cat.needs.hunger) },
      };

      const nextState: WorldState = {
        ...state,
        cats: { ...state.cats, [catId]: updatedCat },
      };

      const event = createDomainEvent(
        'HAZARD_INTERVENTION',
        [catId],
        { message: `${cat.name} received life-saving care` },
        state.clock.simMinute,
        state.nextEventSequence++
      );

      return { state: nextState, events: [event], handled: true };
    }

    case 'PLACE_MEMORIAL': {
      const { deceasedCatId, lotId, x, y } = command.payload;
      const cat = state.cats[deceasedCatId];
      if (!cat || cat.lifeStatus !== 'deceased') {
        return { state, events: [], handled: true, error: { code: 'INVALID_MEMORIAL', message: 'Cat is not deceased' } };
      }

      const memorialId = `mem_${deceasedCatId}`;
      const memorial: MemorialRecord = {
        id: memorialId,
        deceasedCatId,
        name: cat.name,
        appearance: cat.appearance,
        traits: cat.traits,
        ageAtDeathMinutes: cat.ageMinutes,
        causeOfDeath: 'Natural end of lifespan',
        deceasedAtSimMinute: state.clock.simMinute,
        tombstonePosition: { lotId, x, y },
        ghostVisits: [],
      };

      const nextState: WorldState = {
        ...state,
        lifecycle: {
          ...state.lifecycle,
          memorials: { ...state.lifecycle.memorials, [memorialId]: memorial },
        },
      };

      const event = createDomainEvent(
        'MEMORIAL_PLACED',
        [deceasedCatId],
        { memorialId, lotId, x, y },
        state.clock.simMinute,
        state.nextEventSequence++
      );

      return { state: nextState, events: [event], handled: true };
    }

    // --- ECONOMY ---
    case 'BUY_ITEM': {
      const { catalogId, quantity } = command.payload;
      const costPerItem = 20;
      const totalCost = costPerItem * quantity;

      if (state.economy.wallet.earnedCash < totalCost) {
        return {
          state,
          events: [],
          handled: true,
          error: { code: 'INSUFFICIENT_FUNDS', message: 'Not enough earned cash' },
        };
      }

      const itemId = `inv_${catalogId}_${Date.now()}`;
      const item = {
        id: itemId,
        catalogId,
        quantity,
        provenance: 'earned' as const,
      };

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
            [itemId]: item,
          },
        },
      };

      const event = createDomainEvent(
        'ITEM_BOUGHT',
        [context.actorId],
        { catalogId, quantity, totalCost },
        state.clock.simMinute,
        state.nextEventSequence++
      );

      return { state: nextState, events: [event], handled: true };
    }

    case 'TRAVEL_TO_LOT': {
      const { catId, targetLotId } = command.payload;
      const cat = state.cats[catId];
      const targetLot = state.building.lots[targetLotId];
      if (!cat || !targetLot) {
        return { state, events: [], handled: true, error: { code: 'INVALID_TRAVEL', message: 'Cat or lot not found' } };
      }

      const updatedCat: CatRecord = {
        ...cat,
        position: {
          lotId: targetLotId,
          x: 2,
          y: 2,
          facing: 'south',
        },
        currentAction: null,
        actionQueue: [],
        lastRoute: [],
      };

      const nextState: WorldState = {
        ...state,
        cats: { ...state.cats, [catId]: updatedCat },
        neighborhood: { ...state.neighborhood, activeLotId: targetLotId },
      };

      const event = createDomainEvent(
        'CAT_TRAVEL',
        [catId],
        { fromLotId: cat.position.lotId, toLotId: targetLotId },
        state.clock.simMinute,
        state.nextEventSequence++
      );

      return { state: nextState, events: [event], handled: true };
    }

    default:
      return { state, events: [], handled: false };
  }
}
