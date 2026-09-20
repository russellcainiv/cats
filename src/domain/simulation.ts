/**
 * Deterministic Fixed-Step Simulation Engine
 *
 * Implements deterministic simulation ticks, elapsed time clamping,
 * no absent-time advance (R09), autonomous AI updates, needs decay,
 * aging, natural/neglect transitions, and invariant checks.
 */

import { createAction, stepCatAction } from './core/actions';
import { evaluateCatAutonomy } from './core/autonomy';
import { advanceCatAge, createCatRecord } from './core/cat';
import { createDomainEvent } from './core/events';
import { advanceNeeds } from './core/needs';
import { advanceRouteProgress, findPath } from './core/navigation';
import { assertInvariants } from './invariants';
import { SeededRng } from './rng';
import {
  CatRecord,
  DomainEvent,
  MAX_EVENTS_LOG_SIZE,
  MAX_LIVING_CATS_CAPACITY,
  MemorialRecord,
  WorldState,
} from './state';

export const MAX_SIM_MINUTES_PER_ADVANCE = 60; // Clamp large skips (no absent-time leap)

/**
 * Advances the deterministic world simulation by elapsedSimMinutes.
 * If the clock is paused or elapsedSimMinutes <= 0, no progression occurs.
 */
export function advance(state: WorldState, elapsedSimMinutes: number): WorldState {
  // 1. Paused / Closed / Zero-time Check (R09: No absent-time progression)
  if (state.clock.isPaused || elapsedSimMinutes <= 0) {
    return state;
  }

  // 2. Clamp elapsed simulation minutes to prevent unbounded offline catch-up
  const clampedMinutes = Math.min(elapsedSimMinutes, MAX_SIM_MINUTES_PER_ADVANCE);

  // 3. If zero living cats, game automatically pauses and preserves household until adoption
  if (state.livingCatIds.length === 0) {
    return {
      ...state,
      clock: { ...state.clock, isPaused: true },
    };
  }

  // Restore RNG
  const rng = SeededRng.deserialize(
    state.rng.serializedState || {
      seed: state.rng.seed,
      state: state.rng.seed,
      drawCount: state.rng.counter,
      history: [],
    }
  );

  let nextState: WorldState = { ...state };
  const newEvents: DomainEvent[] = [];
  const currentMinute = state.clock.simMinute + clampedMinutes;

  let livingIds = [...nextState.livingCatIds];
  const catsMap: Record<string, CatRecord> = { ...nextState.cats };
  const memorialsMap: Record<string, MemorialRecord> = { ...nextState.lifecycle.memorials };

  // Iterate over each living cat
  for (const catId of [...livingIds]) {
    let cat = catsMap[catId];
    if (!cat || cat.lifeStatus !== 'living') continue;

    // A. Advance Age and Fixed Lifespan Transitions (R23: 150 sim days fixed)
    const ageResult = advanceCatAge(cat, clampedMinutes);
    cat = ageResult.cat;

    if (ageResult.stageChanged && ageResult.newStage) {
      newEvents.push(
        createDomainEvent(
          'CAT_LIFE_STAGE_TRANSITION',
          [catId],
          { catId, oldStage: ageResult.oldStage, newStage: ageResult.newStage },
          currentMinute,
          nextState.nextEventSequence++
        )
      );
    }

    if (ageResult.reachedLifespanEnd) {
      // Natural permanent death from elder lifespan completion (R08, R22)
      cat = { ...cat, lifeStatus: 'deceased' };
      catsMap[catId] = cat;
      livingIds = livingIds.filter((id) => id !== catId);

      // Create memorial record
      const memId = `mem_${catId}`;
      memorialsMap[memId] = {
        id: memId,
        deceasedCatId: catId,
        name: cat.name,
        appearance: cat.appearance,
        traits: cat.traits,
        ageAtDeathMinutes: cat.ageMinutes,
        causeOfDeath: 'Natural end of lifespan',
        deceasedAtSimMinute: currentMinute,
        tombstonePosition: { lotId: cat.position.lotId, x: cat.position.x, y: cat.position.y },
        ghostVisits: [],
      };

      newEvents.push(
        createDomainEvent(
          'CAT_DECEASED',
          [catId],
          { catId, name: cat.name, cause: 'natural_lifespan', memorialId: memId },
          currentMinute,
          nextState.nextEventSequence++
        )
      );
      continue;
    }

    // B. Advance Movement / Navigation Along Route
    if (cat.lastRoute.length > 1) {
      const { newPosition, remainingRoute } = advanceRouteProgress(cat.position, cat.lastRoute, clampedMinutes);
      cat = {
        ...cat,
        position: newPosition,
        lastRoute: remainingRoute,
      };
      if (remainingRoute.length <= 1 && cat.currentAction?.type === 'move') {
        cat = { ...cat, currentAction: null, lastRoute: [] };
      }
    }

    // C. Step Active Action
    const actionResult = stepCatAction(cat, clampedMinutes);
    cat = actionResult.cat;

    // D. Advance Needs & Calculate Mood
    const needsResult = advanceNeeds(cat.needs, cat.traits, clampedMinutes);
    cat = {
      ...cat,
      needs: needsResult.needs,
      moodScore: needsResult.moodScore,
      moodBand: needsResult.moodBand,
    };

    // Check Lethal Neglect / Severe Illness Death (R08)
    if (cat.needs.health <= 0) {
      cat = { ...cat, lifeStatus: 'deceased' };
      catsMap[catId] = cat;
      livingIds = livingIds.filter((id) => id !== catId);

      const memId = `mem_${catId}`;
      memorialsMap[memId] = {
        id: memId,
        deceasedCatId: catId,
        name: cat.name,
        appearance: cat.appearance,
        traits: cat.traits,
        ageAtDeathMinutes: cat.ageMinutes,
        causeOfDeath: 'Severe neglect and illness',
        deceasedAtSimMinute: currentMinute,
        tombstonePosition: { lotId: cat.position.lotId, x: cat.position.x, y: cat.position.y },
        ghostVisits: [],
      };

      newEvents.push(
        createDomainEvent(
          'CAT_DECEASED',
          [catId],
          { catId, name: cat.name, cause: 'neglect_illness', memorialId: memId },
          currentMinute,
          nextState.nextEventSequence++
        )
      );
      continue;
    }

    // E. Autonomous Utility Decision
    if (cat.currentAction === null && cat.actionQueue.length === 0) {
      const autonomyDecision = evaluateCatAutonomy(cat, nextState, rng);
      if (autonomyDecision.shouldAct && autonomyDecision.action) {
        let actionToSet = autonomyDecision.action;
        // If action is move to targetPos, find path
        if (actionToSet.type === 'move' && actionToSet.targetPosition) {
          const lot = nextState.building.lots[cat.position.lotId];
          if (lot) {
            const pathRes = findPath(lot, { x: cat.position.x, y: cat.position.y }, actionToSet.targetPosition);
            if (pathRes.reachable) {
              cat = { ...cat, lastRoute: pathRes.route };
            }
          }
        }
        cat = { ...cat, currentAction: actionToSet };
      }
    }

    catsMap[catId] = cat;
  }

  // 4. Pregnancy Due Date Checking & Birth (R19, R20: atomically exchange reserved slots for kittens)
  const pregnancies = { ...nextState.lifecycle.pregnancies };
  for (const [pregId, preg] of Object.entries(pregnancies)) {
    if (currentMinute >= preg.dueAtSimMinute) {
      // Birth occurs!
      const mother = catsMap[preg.parentIds[0]] || catsMap[preg.parentIds[1]];
      const kittenCount = preg.reservedSlots;

      for (let i = 0; i < kittenCount; i++) {
        if (livingIds.length >= MAX_LIVING_CATS_CAPACITY) break;
        const kittenId = `cat_kitten_${currentMinute}_${i}`;
        const kitten = createCatRecord({
          id: kittenId,
          householdId: nextState.householdId,
          name: `Kitten ${i + 1}`,
          appearance: mother
            ? { ...mother.appearance }
            : {
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
          createdAtSimMinute: currentMinute,
          motherId: preg.parentIds[0],
          fatherId: preg.parentIds[1],
        });

        catsMap[kittenId] = kitten;
        livingIds.push(kittenId);

        newEvents.push(
          createDomainEvent(
            'KITTEN_BORN',
            [kittenId, preg.parentIds[0], preg.parentIds[1]],
            { kittenId, name: kitten.name },
            currentMinute,
            nextState.nextEventSequence++
          )
        );
      }

      delete pregnancies[pregId];

      for (const parentId of preg.parentIds) {
        if (catsMap[parentId] && catsMap[parentId].pregnancyId === pregId) {
          catsMap[parentId] = { ...catsMap[parentId], pregnancyId: undefined };
        }
      }
    }
  }

  // 5. Ghost Projections (Occasional non-resurrecting memorial projections) (R22)
  const activeGhosts = nextState.lifecycle.ghosts.filter((g) => g.expiresAtSimMinute > currentMinute);

  // If there are memorials and no active ghost, occasional chance of ghost visit
  if (activeGhosts.length === 0 && Object.keys(memorialsMap).length > 0) {
    const shouldSpawnGhost = rng.drawBool(0.05, 'ghost_spawn', currentMinute);
    if (shouldSpawnGhost) {
      const memorialList = Object.values(memorialsMap);
      const chosenMem = rng.drawChoice(memorialList, 'ghost_choice', currentMinute);
      activeGhosts.push({
        memorialId: chosenMem.id,
        name: chosenMem.name,
        appearance: chosenMem.appearance,
        position: {
          lotId: chosenMem.tombstonePosition.lotId,
          x: chosenMem.tombstonePosition.x,
          y: chosenMem.tombstonePosition.y,
          facing: 'south',
        },
        expiresAtSimMinute: currentMinute + 60, // 1 hour visit
      });
      newEvents.push(
        createDomainEvent(
          'GHOST_VISIT_BEGAN',
          [],
          { memorialId: chosenMem.id, catName: chosenMem.name },
          currentMinute,
          nextState.nextEventSequence++
        )
      );
    }
  }

  // 6. Update Clock and RNG
  const rngSnap = rng.snapshot();

  nextState = {
    ...nextState,
    clock: {
      ...nextState.clock,
      simMinute: currentMinute,
    },
    rng: {
      seed: rngSnap.seed,
      counter: rngSnap.drawCount,
      serializedState: rng.serialize(),
    },
    livingCatIds: livingIds,
    cats: catsMap,
    lifecycle: {
      ...nextState.lifecycle,
      pregnancies,
      memorials: memorialsMap,
      ghosts: activeGhosts,
    },
    events: [...nextState.events, ...newEvents].slice(-MAX_EVENTS_LOG_SIZE),
  };

  // 7. Verify Invariants
  assertInvariants(nextState);

  return nextState;
}
