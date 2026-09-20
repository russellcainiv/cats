// src/domain/social/reducer.ts
// Reducer for handling Social Subsystem Commands.

import {
  WorldState,
  SocialCommand,
  CommandContext,
  CommandResult,
  DomainEvent,
  InProgressSocialAction,
  SocialRelationship
} from './types';
import { checkMooMooEligibility, checkGeneralSocialEligibility } from './readiness';
import {
  pairKey,
  getRelationship,
  updateRelationshipScore,
  applyTraitModifiers,
  addMemory
} from './relationships';
import { nextRandomFloat } from './rng';

export function isSocialCommand(cmd: unknown): cmd is SocialCommand {
  if (!cmd || typeof cmd !== 'object') return false;
  const type = (cmd as { type?: string }).type;
  return (
    type === 'SOCIAL_INTERACT' ||
    type === 'SUGGEST_MOO_MOO' ||
    type === 'PROPOSE_MOO_MOO' ||
    type === 'CANCEL_SOCIAL_ACTION'
  );
}

export function initializeSocialState() {
  return {
    recentInteractions: [],
    relationships: {},
    memories: {},
    inProgressActions: [],
    pairCooldowns: {},
    completedActionIds: []
  };
}

export function reduceSocial(
  state: WorldState,
  command: SocialCommand,
  context: CommandContext
): CommandResult {
  const currentSocial = {
    ...initializeSocialState(),
    ...(state.social || {}),
  };
  const safeState: WorldState = {
    ...state,
    social: currentSocial,
  };

  // Check command idempotency
  if (currentSocial.completedActionIds?.includes(context.commandId)) {
    return { ok: true, state, events: [] };
  }

  switch (command.type) {
    case 'SUGGEST_MOO_MOO':
    case 'PROPOSE_MOO_MOO': {
      const initiatorId = command.payload.initiatorId;
      const partnerId = command.payload.partnerId;
      const source =
        command.type === 'SUGGEST_MOO_MOO'
          ? 'player'
          : command.payload.source || 'autonomous';

      const eligibility = checkMooMooEligibility(safeState, initiatorId, partnerId);

      if (!eligibility.eligible) {
        // Declined! Decline MUST consume 0 RNG rolls.
        const pKey = pairKey(initiatorId, partnerId);
        const cooldownMinutes = 30; // 30 sim minutes cooldown on decline
        const nextCooldowns = {
          ...currentSocial.pairCooldowns,
          [pKey]: safeState.clock.simMinute + cooldownMinutes,
        };

        const declinedEvent: DomainEvent = {
          id: `evt_${safeState.nextEventSequence}`,
          type: 'MOO_MOO_DECLINED',
          sequence: safeState.nextEventSequence,
          simTime: safeState.clock.simMinute,
          actorIds: [initiatorId, partnerId],
          payload: {
            initiatorId,
            partnerId,
            source,
            reason: eligibility.reason || 'Partner declined',
          },
        };

        const nextState: WorldState = {
          ...safeState,
          social: {
            ...currentSocial,
            pairCooldowns: nextCooldowns,
            completedActionIds: [...(currentSocial.completedActionIds || []), context.commandId],
          },
          events: [...safeState.events, declinedEvent],
          nextEventSequence: safeState.nextEventSequence + 1,
        };

        return {
          ok: false,
          state: nextState,
          error: { code: 'MOO_MOO_DECLINED', message: eligibility.reason || 'Moo-Moo declined' },
        };
      }

      if (command.type === 'SUGGEST_MOO_MOO') {
        // Direct SUGGEST_MOO_MOO executes immediately
        const initiatorCat = safeState.cats[initiatorId];
        const partnerCat = safeState.cats[partnerId];
        let currentRng = safeState.rng;
        let nextSeq = safeState.nextEventSequence;
        const events: DomainEvent[] = [];

        // Fulfill needs & update relationships identically to autonomous Moo-Moo
        const c1 = {
          ...initiatorCat,
          needs: {
            ...initiatorCat.needs,
            social: 100,
            comfort: Math.min(100, (initiatorCat.needs.comfort ?? 50) + 20),
            energy: Math.max(0, initiatorCat.needs.energy - 15),
          },
          relationships: {
            ...initiatorCat.relationships,
            [partnerId]: {
              ...initiatorCat.relationships?.[partnerId],
              lastInteractionMinute: safeState.clock.simMinute,
            },
          },
        };

        const c2 = {
          ...partnerCat,
          needs: {
            ...partnerCat.needs,
            social: 100,
            comfort: Math.min(100, (partnerCat.needs.comfort ?? 50) + 20),
            energy: Math.max(0, partnerCat.needs.energy - 15),
          },
          relationships: {
            ...partnerCat.relationships,
            [initiatorId]: {
              ...partnerCat.relationships?.[initiatorId],
              lastInteractionMinute: safeState.clock.simMinute,
            },
          },
        };

        const completeEvt: DomainEvent = {
          id: `evt_${nextSeq++}`,
          type: 'MOO_MOO_COMPLETED',
          sequence: nextSeq,
          simTime: safeState.clock.simMinute,
          actorIds: [initiatorId, partnerId],
          payload: { initiatorId, partnerId, success: true },
        };
        events.push(completeEvt);

        const livingCount = Object.values(safeState.cats).filter((c) => c.lifeStatus === 'living').length;
        const reservedLitterSlots = Object.values((safeState.lifecycle as any)?.pregnancies || {})
          .filter((p: any) => !p.resolved)
          .reduce((sum: number, p: any) => sum + (p.reservedSlots ?? p.litterSize ?? 0), 0);
        const availableCapacity = Math.max(0, 8 - (livingCount + reservedLitterSlots));

        const nextPregnancies = { ...((safeState.lifecycle as any)?.pregnancies || {}) };

        if (availableCapacity > 0) {
          const drawResult = nextRandomFloat(currentRng, 'moo_moo_conception', safeState.clock.simMinute);
          currentRng = drawResult.nextRng;

          if (drawResult.value <= 0.25) {
            const litterResult = nextRandomFloat(currentRng, 'moo_moo_litter_size', safeState.clock.simMinute);
            currentRng = litterResult.nextRng;

            const rawLitter = 1 + Math.floor(litterResult.value * 3);
            const clampedLitter = Math.max(1, Math.min(rawLitter, availableCapacity));
            const pregId = `preg_${partnerId}_${initiatorId}_${safeState.clock.simMinute}`;
            const dueAt = safeState.clock.simMinute + 4320;

            const pregnancyRecord: any = {
              id: pregId,
              parentIds: [partnerId, initiatorId],
              startedAtSimMinute: safeState.clock.simMinute,
              dueAtSimMinute: dueAt,
              reservedSlots: clampedLitter,
              conceptionEventId: completeEvt.id,
              motherId: partnerId,
              fatherId: initiatorId,
            };
            nextPregnancies[pregId] = pregnancyRecord;
            c2.pregnancyId = pregId;

            const pregEvent: DomainEvent = {
              id: `evt_${nextSeq++}`,
              type: 'PREGNANCY_STARTED',
              sequence: nextSeq,
              simTime: safeState.clock.simMinute,
              actorIds: [partnerId, initiatorId],
              payload: { pregnancyId: pregId, reservedSlots: clampedLitter, dueAtSimMinute: dueAt },
            };
            events.push(pregEvent);
          }
        } else {
          const capacityEvt: DomainEvent = {
            id: `evt_${nextSeq++}`,
            type: 'MOO_MOO_AT_CAPACITY',
            sequence: nextSeq,
            simTime: safeState.clock.simMinute,
            actorIds: [initiatorId, partnerId],
            payload: { message: 'Household capacity reached. No kittens possible.' },
          };
          events.push(capacityEvt);
        }

        const actionId = `act_moo_${context.commandId || nextSeq}_${safeState.clock.simMinute}`;
        const newAction: InProgressSocialAction = {
          id: actionId,
          type: 'moo_moo',
          initiatorId,
          targetId: partnerId,
          startSimMinute: safeState.clock.simMinute,
          totalDurationMinutes: 10,
          elapsedMinutes: 0,
          source: 'player',
        };

        const nextState: WorldState = {
          ...safeState,
          rng: currentRng,
          cats: {
            ...safeState.cats,
            [initiatorId]: c1,
            [partnerId]: c2,
          },
          social: {
            ...currentSocial,
            inProgressActions: [...(currentSocial.inProgressActions || []), newAction],
            completedActionIds: [...(currentSocial.completedActionIds || []), context.commandId],
          },
          lifecycle: {
            ...(safeState.lifecycle || {}),
            pregnancies: nextPregnancies,
          },
          events: [...safeState.events, ...events],
          nextEventSequence: nextSeq,
        };

        return { ok: true, state: nextState, events };
      }

      // Eligible PROPOSE_MOO_MOO! Initiate Moo-Moo in-progress action.
      const actionId = `act_moo_${context.commandId}_${safeState.clock.simMinute}`;
      const actionDurationMinutes = 10; // 10 sim minutes duration

      const newAction: InProgressSocialAction = {
        id: actionId,
        type: 'moo_moo',
        interactionType: 'moo_moo',
        initiatorId,
        targetId: partnerId,
        startSimMinute: safeState.clock.simMinute,
        totalDurationMinutes: actionDurationMinutes,
        elapsedMinutes: 0,
        source,
      };

      // Set current action on both cats
      const initiatorCat = safeState.cats[initiatorId];
      const partnerCat = safeState.cats[partnerId];

      const updatedCats = {
        ...safeState.cats,
        [initiatorId]: {
          ...initiatorCat,
          currentAction: {
            id: actionId,
            type: 'moo_moo',
            targetCatId: partnerId,
            progressMinutes: 0,
            totalMinutes: actionDurationMinutes,
            interruptible: true,
            source,
          },
        },
        [partnerId]: {
          ...partnerCat,
          currentAction: {
            id: actionId,
            type: 'moo_moo',
            targetCatId: initiatorId,
            progressMinutes: 0,
            totalMinutes: actionDurationMinutes,
            interruptible: true,
            source,
          },
        },
      };

      const startEvent: DomainEvent = {
        id: `evt_${safeState.nextEventSequence}`,
        type: 'MOO_MOO_STARTED',
        sequence: safeState.nextEventSequence,
        simTime: safeState.clock.simMinute,
        actorIds: [initiatorId, partnerId],
        payload: {
          actionId,
          initiatorId,
          partnerId,
          durationMinutes: actionDurationMinutes,
          source,
        },
      };

      const nextState: WorldState = {
        ...safeState,
        cats: updatedCats,
        social: {
          ...currentSocial,
          inProgressActions: [...currentSocial.inProgressActions, newAction],
          completedActionIds: [...currentSocial.completedActionIds, context.commandId],
        },
        events: [...safeState.events, startEvent],
        nextEventSequence: safeState.nextEventSequence + 1,
      };

      return { ok: true, state: nextState, events: [startEvent] };
    }

    case 'SOCIAL_INTERACT': {
      const { initiatorId, targetId, interactionType, source = 'player' } = command.payload;
      const eligibility = checkGeneralSocialEligibility(state, initiatorId, targetId);

      if (!eligibility.eligible) {
        return {
          ok: false,
          state,
          error: { code: 'SOCIAL_INTERACT_FAILED', message: eligibility.reason || 'Interaction ineligible' }
        };
      }

      // Compute immediate or short social interaction
      const pKey = pairKey(initiatorId, targetId);
      const existingRel = getRelationship(state.social, initiatorId, targetId);

      let baseFDelta = 10;
      let baseRDelta = 0;

      if (interactionType === 'nuzzle') {
        baseFDelta = 10;
        baseRDelta = 15;
      } else if (interactionType === 'hiss') {
        baseFDelta = -20;
        baseRDelta = -10;
      } else if (interactionType === 'sniff' || interactionType === 'chat') {
        baseFDelta = 8;
        baseRDelta = 2;
      } else if (interactionType === 'play_chase') {
        baseFDelta = 15;
        baseRDelta = 0;
      }

      const { friendshipDelta, romanceDelta } = applyTraitModifiers(
        state.cats[initiatorId],
        state.cats[targetId],
        interactionType,
        baseFDelta,
        baseRDelta
      );

      const updatedRel = updateRelationshipScore(
        existingRel,
        friendshipDelta,
        romanceDelta,
        state.clock.simMinute
      );

      let nextSocial = {
        ...state.social,
        relationships: {
          ...state.social.relationships,
          [pKey]: updatedRel
        },
        pairCooldowns: {
          ...state.social.pairCooldowns,
          [pKey]: state.clock.simMinute + 15 // 15 sim minutes social cooldown
        },
        recentInteractions: [
          { fromId: initiatorId, toId: targetId, type: interactionType, simMinute: state.clock.simMinute },
          ...state.social.recentInteractions
        ].slice(0, 50),
        completedActionIds: [...state.social.completedActionIds, context.commandId]
      };

      // Add memories for milestone events
      if (updatedRel.isFriend && !existingRel.isFriend) {
        nextSocial = addMemory(nextSocial, initiatorId, {
          otherCatId: targetId,
          type: 'became_friends',
          summary: `Became good friends with ${state.cats[targetId].name}`,
          simMinute: state.clock.simMinute,
          sentiment: 'positive'
        });
        nextSocial = addMemory(nextSocial, targetId, {
          otherCatId: initiatorId,
          type: 'became_friends',
          summary: `Became good friends with ${state.cats[initiatorId].name}`,
          simMinute: state.clock.simMinute,
          sentiment: 'positive'
        });
      } else if (updatedRel.isRival && !existingRel.isRival) {
        nextSocial = addMemory(nextSocial, initiatorId, {
          otherCatId: targetId,
          type: 'became_rivals',
          summary: `Became rivals with ${state.cats[targetId].name}`,
          simMinute: state.clock.simMinute,
          sentiment: 'negative'
        });
      }

      const interactEvent: DomainEvent = {
        id: `evt_${state.nextEventSequence}`,
        type: 'SOCIAL_INTERACTION_COMPLETED',
        sequence: state.nextEventSequence,
        simTime: state.clock.simMinute,
        actorIds: [initiatorId, targetId],
        payload: {
          initiatorId,
          targetId,
          interactionType,
          friendshipDelta,
          romanceDelta,
          newFriendship: updatedRel.friendship,
          newRomance: updatedRel.romance,
          source
        }
      };

      const nextState: WorldState = {
        ...state,
        social: nextSocial,
        events: [...state.events, interactEvent],
        nextEventSequence: state.nextEventSequence + 1
      };

      return { ok: true, state: nextState, events: [interactEvent] };
    }

    case 'CANCEL_SOCIAL_ACTION': {
      const { catId } = command.payload;
      const activeAction = state.social.inProgressActions.find(
        (a) => a.initiatorId === catId || a.targetId === catId
      );

      if (!activeAction) {
        return { ok: true, state, events: [] };
      }

      // Cancel social action safely
      const partnerId = activeAction.initiatorId === catId ? activeAction.targetId : activeAction.initiatorId;

      const remainingActions = state.social.inProgressActions.filter((a) => a.id !== activeAction.id);

      const updatedCats = { ...state.cats };
      if (updatedCats[catId] && updatedCats[catId].currentAction?.id === activeAction.id) {
        updatedCats[catId] = { ...updatedCats[catId], currentAction: null };
      }
      if (updatedCats[partnerId] && updatedCats[partnerId].currentAction?.id === activeAction.id) {
        updatedCats[partnerId] = { ...updatedCats[partnerId], currentAction: null };
      }

      const cancelEvent: DomainEvent = {
        id: `evt_${state.nextEventSequence}`,
        type: 'MOO_MOO_CANCELLED',
        sequence: state.nextEventSequence,
        simTime: state.clock.simMinute,
        actorIds: [catId, partnerId],
        payload: { actionId: activeAction.id, reason: 'Action cancelled by player or event' }
      };

      const nextState: WorldState = {
        ...state,
        cats: updatedCats,
        social: {
          ...state.social,
          inProgressActions: remainingActions,
          completedActionIds: [...state.social.completedActionIds, context.commandId]
        },
        events: [...state.events, cancelEvent],
        nextEventSequence: state.nextEventSequence + 1
      };

      return { ok: true, state: nextState, events: [cancelEvent] };
    }

    default:
      return { ok: false, state, error: { code: 'UNKNOWN_COMMAND', message: 'Unknown command type' } };
  }
}
