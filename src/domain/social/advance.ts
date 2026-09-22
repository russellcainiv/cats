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
  if (elapsedSimMinutes <= 0 || state.clock.isPaused) {
    return state;
  }

  const newSimMinute = state.clock.simMinute + elapsedSimMinutes;
  let currentRng = { ...state.rng };
  let nextEvents = [...state.events];
  let nextEventSequence = state.nextEventSequence;
  let nextCats = { ...state.cats };
  let nextSocial = { ...state.social };
  let nextPregnancies = { ...state.lifecycle.pregnancies };

  const remainingActions: InProgressSocialAction[] = [];

  for (const action of state.social.inProgressActions) {
    const initiator = nextCats[action.initiatorId];
    const target = nextCats[action.targetId];

    // Safe settlement check if cat missing, deceased, or moved away
    if (
      !initiator ||
      !target ||
      initiator.lifeStatus !== 'living' ||
      target.lifeStatus !== 'living'
    ) {
      // Settle safely
      const cancelEvt: DomainEvent = {
        id: `evt_${nextEventSequence++}`,
        type: 'MOO_MOO_CANCELLED',
        sequence: nextEventSequence,
        simTime: newSimMinute,
        actorIds: [action.initiatorId, action.targetId].filter((id) => nextCats[id]),
        payload: { actionId: action.id, reason: 'Participant deceased, missing, or moved away' }
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
        { ...state, cats: nextCats, social: nextSocial, clock: { ...state.clock, simMinute: newSimMinute } },
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
          simTime: newSimMinute,
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
            [pKey]: newSimMinute + 30
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
        simTime: newSimMinute,
        actorIds: [action.initiatorId, action.targetId],
        payload: { actionId: action.id, source: action.source }
      };
      nextEvents.push(completeEvt);

      // Check household capacity
      const livingCount = Object.values(nextCats).filter((c) => c.lifeStatus === 'living').length;
      const reservedLitterSlots = Object.values(nextPregnancies).reduce(
        (sum, p) => sum + p.reservedSlots,
        0
      );

      const totalOccupiedAndReserved = livingCount + reservedLitterSlots;
      const availableSlots = Math.max(0, 8 - totalOccupiedAndReserved);

      let pregnancyConceived = false;
      let pregnancyRecord: PregnancyRecord | null = null;

      if (availableSlots <= 0) {
        // At capacity limit (8 living + reserved)!
        // Romance action completes, BUT EXACTLY ZERO conception draws are made!
      } else {
        // Available capacity exists! Make exactly ONE 25% conception draw.
        const drawResult = nextRandomFloat(currentRng);
        currentRng = drawResult.nextRng;

        if (drawResult.value <= 0.25) {
          // Conception succeeds! Draw litter size (1 to 3).
          const litterResult = nextRandomFloat(currentRng);
          currentRng = litterResult.nextRng;

          const rawLitter = 1 + Math.floor(litterResult.value * 3); // 1, 2, or 3
          const clampedLitter = Math.max(1, Math.min(rawLitter, availableSlots));

          const motherId = action.targetId; // Partner/target as mother
          const fatherId = action.initiatorId;

          const pregId = `preg_${motherId}_${fatherId}_${newSimMinute}`;
          pregnancyRecord = {
            id: pregId,
            motherId,
            fatherId,
            conceivedAtSimMinute: newSimMinute,
            dueAtSimMinute: newSimMinute + 3 * 24 * 60, // 3 sim days = 4320 sim minutes
            reservedSlots: clampedLitter,
            litterSize: clampedLitter,
            rngSeedAtConception: currentRng.seed
          };

          nextPregnancies[pregId] = pregnancyRecord;
          pregnancyConceived = true;

          // Set isPregnant on mother
          if (nextCats[motherId]) {
            nextCats[motherId] = { ...nextCats[motherId], isPregnant: true };
          }

          const pregEvt: DomainEvent = {
            id: `evt_${nextEventSequence++}`,
            type: 'PREGNANCY_CONCEIVED',
            sequence: nextEventSequence,
            simTime: newSimMinute,
            actorIds: [motherId, fatherId],
            payload: {
              pregnancyId: pregId,
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
      const updatedRel = updateRelationshipScore(existingRel, 15, 20, newSimMinute);

      nextSocial = {
        ...nextSocial,
        relationships: {
          ...nextSocial.relationships,
          [pKey]: updatedRel
        },
        pairCooldowns: {
          ...nextSocial.pairCooldowns,
          [pKey]: newSimMinute + 120 // 120 sim minutes pair cooldown after Moo-Moo
        }
      };

      // Add memory of Moo-Moo
      nextSocial = addMemory(nextSocial, action.initiatorId, {
        otherCatId: action.targetId,
        type: 'moo_moo_completed',
        summary: `Shared a romantic Moo-Moo with ${nextCats[action.targetId].name}`,
        simMinute: newSimMinute,
        sentiment: 'positive'
      });
      nextSocial = addMemory(nextSocial, action.targetId, {
        otherCatId: action.initiatorId,
        type: 'moo_moo_completed',
        summary: `Shared a romantic Moo-Moo with ${nextCats[action.initiatorId].name}`,
        simMinute: newSimMinute,
        sentiment: 'positive'
      });

      // Clear current actions
      if (nextCats[action.initiatorId]?.currentAction?.id === action.id) {
        nextCats[action.initiatorId] = { ...nextCats[action.initiatorId], currentAction: null };
      }
      if (nextCats[action.targetId]?.currentAction?.id === action.id) {
        nextCats[action.targetId] = { ...nextCats[action.targetId], currentAction: null };
      }
    }
  }

  return {
    ...state,
    clock: {
      ...state.clock,
      simMinute: newSimMinute
    },
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
