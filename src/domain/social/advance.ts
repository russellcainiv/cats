// src/domain/social/advance.ts
// Advance social subsystem simulation time and process in-progress social actions.

import {
  WorldState,
  DomainEvent,
  InProgressSocialAction,
  PregnancyRecord
} from './types';
import { checkMooMooEligibility } from './readiness';
import {
  pairKey,
  getRelationship,
  updateRelationshipScore,
  addMemory
} from './relationships';
import { nextRandomFloat } from './rng';

export function advanceSocial(state: WorldState, elapsedSimMinutes: number): WorldState {
  if (elapsedSimMinutes <= 0 || state.clock.isPaused || !state.social) {
    return state;
  }

  // Simulation clock is authoritative and advanced by core engine.
  const currentSimMinute = state.clock.simMinute;
  let currentRng = { ...state.rng };
  let nextEvents = [...state.events];
  let nextEventSequence = state.nextEventSequence;
  let nextCats = { ...state.cats };
  let nextSocial = { ...state.social };
  let nextPregnancies = { ...(state.lifecycle?.pregnancies || {}) };

  const remainingActions: InProgressSocialAction[] = [];

  for (const action of (state.social.inProgressActions || [])) {
    const initiator = nextCats[action.initiatorId];
    const target = nextCats[action.targetId];

    // Check if either participant is missing, deceased, no longer adult, at work, or redirected to another action
    const isInterrupted =
      !initiator ||
      !target ||
      initiator.lifeStatus !== 'living' ||
      target.lifeStatus !== 'living' ||
      initiator.lifeStage !== 'adult' ||
      target.lifeStage !== 'adult' ||
      initiator.isAtWork ||
      target.isAtWork ||
      initiator.isWorking ||
      target.isWorking ||
      initiator.currentAction?.id !== action.id ||
      target.currentAction?.id !== action.id;

    if (isInterrupted) {
      // Settle safely and clear paired action
      const cancelEvt: DomainEvent = {
        id: `evt_${nextEventSequence++}`,
        type: 'MOO_MOO_CANCELLED',
        sequence: nextEventSequence,
        simTime: currentSimMinute,
        actorIds: [action.initiatorId, action.targetId].filter((id) => nextCats[id]),
        payload: {
          actionId: action.id,
          reason:
            !initiator || !target || initiator.lifeStatus !== 'living' || target.lifeStatus !== 'living'
              ? 'Participant deceased, missing, or moved away'
              : 'Action interrupted, redirected, or participant unavailable',
        }
      };
      nextEvents.push(cancelEvt);

      if (initiator && initiator.currentAction?.id === action.id) {
        nextCats[action.initiatorId] = { ...initiator, currentAction: null };
      }
      if (target && target.currentAction?.id === action.id) {
        nextCats[action.targetId] = { ...target, currentAction: null };
      }
      continue;
    }

    const updatedElapsed = action.elapsedMinutes + elapsedSimMinutes;

    if (updatedElapsed < action.totalDurationMinutes) {
      // In progress
      const updatedAction = { ...action, elapsedMinutes: updatedElapsed };
      remainingActions.push(updatedAction);

      if (initiator.currentAction?.id === action.id) {
        nextCats[action.initiatorId] = {
          ...initiator,
          currentAction: { ...initiator.currentAction, progressMinutes: updatedElapsed }
        };
      }
      if (target.currentAction?.id === action.id) {
        nextCats[action.targetId] = {
          ...target,
          currentAction: { ...target.currentAction, progressMinutes: updatedElapsed }
        };
      }
    } else {
      // Action completes!
      // Re-verify eligibility at completion time
      const eligibility = checkMooMooEligibility(
        { ...state, cats: nextCats, social: nextSocial, clock: { ...state.clock, simMinute: currentSimMinute } },
        action.initiatorId,
        action.targetId
      );

      const pKey = pairKey(action.initiatorId, action.targetId);

      if (!eligibility.eligible) {
        // Declined at completion time! Consumes 0 RNG.
        const declineEvt: DomainEvent = {
          id: `evt_${nextEventSequence++}`,
          type: 'MOO_MOO_DECLINED',
          sequence: nextEventSequence,
          simTime: currentSimMinute,
          actorIds: [action.initiatorId, action.targetId],
          payload: {
            actionId: action.id,
            reason: eligibility.reason || 'Readiness failed at completion'
          }
        };
        nextEvents.push(declineEvt);

        nextSocial = {
          ...nextSocial,
          pairCooldowns: {
            ...nextSocial.pairCooldowns,
            [pKey]: currentSimMinute + 30
          }
        };

        if (initiator.currentAction?.id === action.id) {
          nextCats[action.initiatorId] = { ...initiator, currentAction: null };
        }
        if (target.currentAction?.id === action.id) {
          nextCats[action.targetId] = { ...target, currentAction: null };
        }
        continue;
      }

      // Successful completion!
      const completeEvt: DomainEvent = {
        id: `evt_${nextEventSequence++}`,
        type: 'MOO_MOO_COMPLETED',
        sequence: nextEventSequence,
        simTime: currentSimMinute,
        actorIds: [action.initiatorId, action.targetId],
        payload: { actionId: action.id, source: action.source }
      };
      nextEvents.push(completeEvt);

      // Check household capacity (8 living + active reserved slots)
      const livingCount = Object.values(nextCats).filter((c) => c.lifeStatus === 'living').length;
      const reservedLitterSlots = Object.values(nextPregnancies)
        .filter((p: any) => !p.resolved)
        .reduce(
          (sum, p: any) => sum + (p.reservedSlots ?? p.litterSize ?? 0),
          0
        );

      const totalOccupiedAndReserved = livingCount + reservedLitterSlots;
      const availableSlots = Math.max(0, 8 - totalOccupiedAndReserved);

      let pregnancyConceived = false;
      let pregnancyRecord: PregnancyRecord | null = null;

      if (availableSlots <= 0 || nextCats[action.targetId]?.isPregnant || nextCats[action.targetId]?.pregnancyId) {
        // At capacity limit or dam is already pregnant: zero conception draws
      } else {
        // Available capacity exists! Make exactly ONE 25% conception draw.
        const drawResult = nextRandomFloat(currentRng, 'moo_moo_conception', currentSimMinute);
        currentRng = drawResult.nextRng;

        if (drawResult.value <= 0.25) {
          // Conception succeeds! Draw litter size (1 to 3).
          const litterResult = nextRandomFloat(currentRng, 'moo_moo_litter_size', currentSimMinute);
          currentRng = litterResult.nextRng;

          const rawLitter = 1 + Math.floor(litterResult.value * 3); // 1, 2, or 3
          const clampedLitter = Math.max(1, Math.min(rawLitter, availableSlots));

          const motherId = action.targetId; // Partner/target as gestating mother
          const fatherId = action.initiatorId;

          const pregId = `preg_${motherId}_${fatherId}_${currentSimMinute}`;
          const conceptionEvtId = `evt_${nextEventSequence++}`;
          pregnancyRecord = {
            id: pregId,
            parentIds: [motherId, fatherId],
            startedAtSimMinute: currentSimMinute,
            dueAtSimMinute: currentSimMinute + 3 * 24 * 60, // 3 sim days = 4320 sim minutes
            reservedSlots: clampedLitter,
            conceptionEventId: conceptionEvtId,
            // Compatibility fields
            motherId,
            fatherId,
            damId: motherId,
            sireId: fatherId,
            conceivedAtSimMinute: currentSimMinute,
            litterSize: clampedLitter,
            resolved: false,
            rngSeedAtConception: currentRng.seed
          };

          nextPregnancies[pregId] = pregnancyRecord;
          pregnancyConceived = true;

          // Set isPregnant on mother
          if (nextCats[motherId]) {
            nextCats[motherId] = { ...nextCats[motherId], isPregnant: true, pregnancyId: pregId };
          }

          const pregEvt: DomainEvent = {
            id: conceptionEvtId,
            type: 'PREGNANCY_CONCEIVED',
            sequence: nextEventSequence,
            simTime: currentSimMinute,
            actorIds: [motherId, fatherId],
            payload: {
              pregnancyId: pregId,
              parentIds: [motherId, fatherId],
              motherId,
              fatherId,
              reservedSlots: clampedLitter,
              litterSize: clampedLitter,
              dueAtSimMinute: pregnancyRecord.dueAtSimMinute
            }
          };
          nextEvents.push(pregEvt);
        }
      }

      // Update relationship & memories
      const existingRel = getRelationship(nextSocial, action.initiatorId, action.targetId);
      const updatedRel = updateRelationshipScore(existingRel, 15, 20, currentSimMinute);

      nextSocial = {
        ...nextSocial,
        relationships: {
          ...nextSocial.relationships,
          [pKey]: updatedRel
        },
        pairCooldowns: {
          ...nextSocial.pairCooldowns,
          [pKey]: currentSimMinute + 120 // 120 sim minutes pair cooldown after Moo-Moo
        }
      };

      // Add memory of Moo-Moo
      nextSocial = addMemory(nextSocial, action.initiatorId, {
        otherCatId: action.targetId,
        type: 'moo_moo_completed',
        summary: `Shared a romantic Moo-Moo with ${nextCats[action.targetId].name}`,
        simMinute: currentSimMinute,
        sentiment: 'positive'
      });
      nextSocial = addMemory(nextSocial, action.targetId, {
        otherCatId: action.initiatorId,
        type: 'moo_moo_completed',
        summary: `Shared a romantic Moo-Moo with ${nextCats[action.initiatorId].name}`,
        simMinute: currentSimMinute,
        sentiment: 'positive'
      });

      // Fulfill needs and clear current actions
      if (nextCats[action.initiatorId]) {
        nextCats[action.initiatorId] = {
          ...nextCats[action.initiatorId],
          needs: {
            ...nextCats[action.initiatorId].needs,
            social: 100,
            comfort: Math.min(100, (nextCats[action.initiatorId].needs.comfort ?? 50) + 20),
            energy: Math.max(0, nextCats[action.initiatorId].needs.energy - 15),
          },
          currentAction: nextCats[action.initiatorId]?.currentAction?.id === action.id ? null : nextCats[action.initiatorId].currentAction,
        };
      }
      if (nextCats[action.targetId]) {
        nextCats[action.targetId] = {
          ...nextCats[action.targetId],
          needs: {
            ...nextCats[action.targetId].needs,
            social: 100,
            comfort: Math.min(100, (nextCats[action.targetId].needs.comfort ?? 50) + 20),
            energy: Math.max(0, nextCats[action.targetId].needs.energy - 15),
          },
          currentAction: nextCats[action.targetId]?.currentAction?.id === action.id ? null : nextCats[action.targetId].currentAction,
        };
      }
    }
  }

  return {
    ...state,
    clock: state.clock,
    rng: currentRng,
    cats: nextCats,
    social: {
      ...nextSocial,
      inProgressActions: remainingActions
    },
    lifecycle: {
      ...state.lifecycle,
      pregnancies: nextPregnancies
    },
    events: nextEvents,
    nextEventSequence
  };
}
