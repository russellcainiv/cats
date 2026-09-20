/**
 * Deterministic Fixed-Step Simulation Engine
 *
 * Implements deterministic 1-minute sub-stepping ticks, elapsed time clamping,
 * no absent-time advance (R09), autonomous AI updates, needs decay,
 * aging, natural/neglect transitions, career shifts, and invariant checks.
 */

import { createAction, stepCatAction } from './core/actions';
import { evaluateCatAutonomy } from './core/autonomy';
import { advanceCatAge, createCatRecord } from './core/cat';
import { createDomainEvent } from './core/events';
import { advanceRouteProgress, cellKey, findPath } from './core/navigation';
import { advanceNeeds } from './core/needs';
import { advanceEconomy } from './core/subsystems';
import { assertInvariants } from './invariants';
import { SeededRng } from './rng';
import {
  calculateAvailableCapacity,
  CatRecord,
  DomainEvent,
  GridCell,
  MAX_EVENTS_LOG_SIZE,
  MAX_LIVING_CATS_CAPACITY,
  MemorialRecord,
  PregnancyRecord,
  WorldState,
} from './state';

export const MAX_SIM_MINUTES_PER_ADVANCE = 60; // Clamp large skips (no absent-time leap)

/**
 * Advances the deterministic world simulation by elapsedSimMinutes.
 * Uses a fixed 1-minute sub-stepping loop with fractional accumulation
 * guaranteeing strict mathematical segmentation invariance:
 * advance(state, 10) === 10 * advance(state, 1)
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

  // Fixed-step sub-stepping with fractional minute accumulation
  let totalMinutes = (state.clock.fractionalMinutes ?? 0) + clampedMinutes;
  let current = state;

  while (totalMinutes >= 1 && !current.clock.isPaused && current.livingCatIds.length > 0) {
    current = stepSingleMinute(current);
    totalMinutes -= 1;
  }

  return {
    ...current,
    clock: {
      ...current.clock,
      fractionalMinutes: current.clock.isPaused ? 0 : Math.round(totalMinutes * 1e6) / 1e6,
    },
  };
}

/**
 * Advances the simulation by exactly ONE simulation minute.
 * Runs in fresh synchronized phases:
 * Phase 1: Physical simulation, movement, action progress, need decay, death checks
 * Phase 2: Fresh synchronized world snapshot
 * Phase 3: Autonomy evaluation with interaction spot routing
 * Phase 4: Lifecycle births
 * Phase 5: Economy career shift transitions
 * Phase 6: Ghost projections
 */
export function stepSingleMinute(state: WorldState): WorldState {
  if (state.clock.isPaused || state.livingCatIds.length === 0) {
    return state;
  }

  // Restore RNG from state
  const rng = SeededRng.deserialize(
    state.rng.serializedState || {
      seed: state.rng.seed,
      state: state.rng.seed,
      drawCount: state.rng.counter,
      history: [],
    }
  );

  const currentMinute = state.clock.simMinute + 1;
  let nextSeq = state.nextEventSequence;
  const newEvents: DomainEvent[] = [];

  let livingIds = [...state.livingCatIds];
  const catsMap: Record<string, CatRecord> = { ...state.cats };
  const memorialsMap: Record<string, MemorialRecord> = { ...state.lifecycle.memorials };
  const pregnanciesMap: Record<string, PregnancyRecord> = { ...state.lifecycle.pregnancies };
  let selectedCatId = state.selectedCatId;

  // -------------------------------------------------------------------------
  // PHASE 1: Physical Updates for Living Cats
  // -------------------------------------------------------------------------
  for (const catId of [...livingIds]) {
    let cat = catsMap[catId];
    if (!cat || cat.lifeStatus !== 'living') continue;

    // A. Advance Age and Fixed Lifespan Transitions (150 sim days fixed)
    const ageResult = advanceCatAge(cat, 1);
    cat = ageResult.cat;

    if (ageResult.stageChanged && ageResult.newStage) {
      newEvents.push(
        createDomainEvent(
          'CAT_LIFE_STAGE_TRANSITION',
          [catId],
          { catId, oldStage: ageResult.oldStage, newStage: ageResult.newStage },
          currentMinute,
          nextSeq++
        )
      );
    }

    if (ageResult.reachedLifespanEnd) {
      // Natural permanent death from elder lifespan completion (R08, R22)
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
        causeOfDeath: 'Natural end of lifespan',
        deceasedAtSimMinute: currentMinute,
        tombstonePosition: { lotId: cat.position.lotId, x: cat.position.x, y: cat.position.y },
        ghostVisits: [],
      };

      // Selection cleanup: if deceased cat was selected, pick next living cat or null
      if (selectedCatId === catId) {
        selectedCatId = livingIds[0] ?? null;
      }

      newEvents.push(
        createDomainEvent(
          'CAT_DECEASED',
          [catId],
          { catId, name: cat.name, cause: 'natural_lifespan', memorialId: memId },
          currentMinute,
          nextSeq++
        )
      );
      continue;
    }

    // B. Advance Movement along Route
    if (cat.lastRoute.length > 1) {
      const { newPosition, remainingRoute } = advanceRouteProgress(cat.position, cat.lastRoute, 1);
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
    const actionResult = stepCatAction(cat, 1);
    cat = actionResult.cat;

    // Handle Moo-Moo action completion effects
    if (actionResult.completedAction && actionResult.completedAction.type === 'moo_moo') {
      const partnerId = actionResult.completedAction.targetId;
      const partner = partnerId ? catsMap[partnerId] : undefined;

      if (partner && partner.lifeStatus === 'living') {
        const isAdults = cat.lifeStage === 'adult' && partner.lifeStage === 'adult';
        const rel1 = cat.relationships[partner.id];
        const rel2 = partner.relationships[cat.id];
        const mutualLove = Boolean(rel1?.isLove && rel2?.isLove && rel1.romance >= 70 && rel2.romance >= 70);

        const initiatorInMood =
          cat.moodScore >= 60 && cat.needs.energy >= 30 && cat.needs.social >= 30 && cat.needs.health > 40 && !cat.pregnancyId;
        const partnerInMood =
          partner.moodScore >= 60 && partner.needs.energy >= 30 && partner.needs.social >= 30 && partner.needs.health > 40 && !partner.pregnancyId;

        const eligible = isAdults && mutualLove && initiatorInMood && partnerInMood;

        if (eligible) {
          cat.relationships[partner.id] = {
            ...rel1,
            lastInteractionMinute: currentMinute,
          };
          partner.relationships[cat.id] = {
            ...rel2,
            lastInteractionMinute: currentMinute,
          };
          cat.needs.social = 100;
          cat.needs.comfort = Math.min(100, cat.needs.comfort + 20);
          cat.needs.energy = Math.max(0, cat.needs.energy - 15);
          partner.needs.social = 100;
          partner.needs.comfort = Math.min(100, partner.needs.comfort + 20);
          partner.needs.energy = Math.max(0, partner.needs.energy - 15);
          catsMap[partner.id] = partner;

          newEvents.push(
            createDomainEvent(
              'MOO_MOO_COMPLETED',
              [cat.id, partner.id],
              { success: true },
              currentMinute,
              nextSeq++
            )
          );

          // Capacity calculation
          let totalReserved = 0;
          for (const p of Object.values(pregnanciesMap)) {
            totalReserved += p.reservedSlots;
          }
          const availableCapacity = Math.max(0, MAX_LIVING_CATS_CAPACITY - livingIds.length - totalReserved);

          if (availableCapacity > 0) {
            // Exactly ONE 25% conception draw (R19)
            const conceived = rng.drawBool(0.25, 'moo_moo_conception', currentMinute);
            if (conceived) {
              const rawLitterSize = rng.drawInt(1, 3, 'moo_moo_litter_size', currentMinute);
              const reservedSlots = Math.min(rawLitterSize, availableCapacity);
              const pregnancyId = `preg_${cat.id}_${partner.id}_${currentMinute}`;

              const pregnancy: PregnancyRecord = {
                id: pregnancyId,
                parentIds: [cat.id, partner.id],
                startedAtSimMinute: currentMinute,
                dueAtSimMinute: currentMinute + 4320, // 3 sim days
                reservedSlots,
                conceptionEventId: `evt_moo_${nextSeq - 1}`,
              };

              pregnanciesMap[pregnancyId] = pregnancy;
              partner.pregnancyId = pregnancyId;
              catsMap[partner.id] = partner;

              newEvents.push(
                createDomainEvent(
                  'PREGNANCY_STARTED',
                  [partner.id, cat.id],
                  { pregnancyId, reservedSlots, dueAtSimMinute: pregnancy.dueAtSimMinute },
                  currentMinute,
                  nextSeq++,
                  'moo_moo_conception'
                )
              );
            }
          } else {
            // At capacity: successful romantic encounter, zero conception rolls
            newEvents.push(
              createDomainEvent(
                'MOO_MOO_AT_CAPACITY',
                [cat.id, partner.id],
                { message: 'Household capacity reached. No kittens possible.' },
                currentMinute,
                nextSeq++
              )
            );
          }
        } else {
          // Declined
          newEvents.push(
            createDomainEvent(
              'MOO_MOO_DECLINED',
              [cat.id, partner.id],
              { reason: 'Conditions not met for Moo-Moo' },
              currentMinute,
              nextSeq++
            )
          );
        }
      }
    }

    // D. Advance Needs & Calculate Mood
    const needsResult = advanceNeeds(cat.needs, cat.traits, 1);
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

      // Selection cleanup: if deceased cat was selected, clear or pick living cat
      if (selectedCatId === catId) {
        selectedCatId = livingIds[0] ?? null;
      }

      newEvents.push(
        createDomainEvent(
          'CAT_DECEASED',
          [catId],
          { catId, name: cat.name, cause: 'neglect_illness', memorialId: memId },
          currentMinute,
          nextSeq++
        )
      );
      continue;
    }

    catsMap[catId] = cat;
  }

  // -------------------------------------------------------------------------
  // PHASE 2: Fresh Synchronized Snapshot for Autonomy
  // -------------------------------------------------------------------------
  let synchronizedState: WorldState = {
    ...state,
    clock: {
      ...state.clock,
      simMinute: currentMinute,
      isPaused: livingIds.length === 0,
    },
    selectedCatId,
    livingCatIds: livingIds,
    cats: catsMap,
    lifecycle: {
      ...state.lifecycle,
      pregnancies: pregnanciesMap,
      memorials: memorialsMap,
    },
    nextEventSequence: nextSeq,
  };

  // -------------------------------------------------------------------------
  // PHASE 3: Autonomy Evaluation (Evaluating Against Fresh Synchronized State)
  // -------------------------------------------------------------------------
  for (const catId of livingIds) {
    let cat = catsMap[catId];
    if (!cat || cat.lifeStatus !== 'living') continue;

    if (cat.currentAction === null && cat.actionQueue.length === 0) {
      const autonomyDecision = evaluateCatAutonomy(cat, synchronizedState, rng);
      if (autonomyDecision.shouldAct && autonomyDecision.action) {
        const actionToSet = autonomyDecision.action;
        const lot = synchronizedState.building.lots[cat.position.lotId];

        if (lot && actionToSet.targetPosition) {
          const targetPos = actionToSet.targetPosition;
          const isAtSpot = cat.position.x === targetPos.x && cat.position.y === targetPos.y;

          if (actionToSet.type === 'move') {
            const pathRes = findPath(lot, { x: cat.position.x, y: cat.position.y }, targetPos);
            if (pathRes.reachable) {
              cat = { ...cat, currentAction: actionToSet, lastRoute: pathRes.route };
            }
          } else {
            // Care or social action targeting an anchor
            if (!isAtSpot) {
              const pathRes = findPath(lot, { x: cat.position.x, y: cat.position.y }, targetPos);
              if (pathRes.reachable) {
                const moveAction = createAction({
                  id: `act_move_${catId}_${currentMinute}_${nextSeq++}`,
                  type: 'move',
                  targetPosition: targetPos,
                  durationMinutes: Math.max(1, pathRes.route.length - 1),
                  autonomous: true,
                  payload: { route: pathRes.route },
                });
                cat = {
                  ...cat,
                  currentAction: moveAction,
                  actionQueue: [actionToSet],
                  lastRoute: pathRes.route,
                };
              }
            } else {
              cat = { ...cat, currentAction: actionToSet };
            }
          }
        } else {
          cat = { ...cat, currentAction: actionToSet };
        }

        catsMap[catId] = cat;
        synchronizedState.cats[catId] = cat;
      }
    }
  }

  // -------------------------------------------------------------------------
  // PHASE 4: Pregnancy Due Date Checking & Birth (R19, R20)
  // -------------------------------------------------------------------------
  for (const [pregId, preg] of Object.entries(pregnanciesMap)) {
    if (currentMinute >= preg.dueAtSimMinute) {
      const mother = catsMap[preg.parentIds[0]] || catsMap[preg.parentIds[1]];
      const father = catsMap[preg.parentIds[1]] || catsMap[preg.parentIds[0]];
      const kittenCount = preg.reservedSlots;

      for (let i = 0; i < kittenCount; i++) {
        if (livingIds.length >= MAX_LIVING_CATS_CAPACITY) break;
        const kittenId = `cat_kitten_${currentMinute}_${i}`;
        const kittenName = `Kitten ${i + 1}`;

        const inheritedBreed = mother?.appearance.breed || father?.appearance.breed || 'domestic_shorthair';
        const primaryColor = i % 2 === 0 ? mother?.appearance.primaryColor || '#F5E6D3' : father?.appearance.primaryColor || '#333333';
        const secondaryColor = father?.appearance.secondaryColor || mother?.appearance.secondaryColor;
        const pattern = mother?.appearance.pattern || 'solid';
        const eyeColor = i % 2 === 0 ? mother?.appearance.eyeColor || 'blue' : father?.appearance.eyeColor || 'green';

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
            nextSeq++
          )
        );
      }

      delete pregnanciesMap[pregId];

      for (const parentId of preg.parentIds) {
        if (catsMap[parentId] && catsMap[parentId].pregnancyId === pregId) {
          catsMap[parentId] = { ...catsMap[parentId], pregnancyId: undefined };
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // PHASE 5: Economy Shift Transitions (Work clothes on departure, restore on return)
  // -------------------------------------------------------------------------
  let intermediateState: WorldState = {
    ...synchronizedState,
    livingCatIds: livingIds,
    cats: catsMap,
    lifecycle: {
      ...synchronizedState.lifecycle,
      pregnancies: pregnanciesMap,
      memorials: memorialsMap,
    },
    nextEventSequence: nextSeq,
  };

  intermediateState = advanceEconomy(intermediateState, 1);
  nextSeq = intermediateState.nextEventSequence;

  // -------------------------------------------------------------------------
  // PHASE 6: Ghost Projections (R22)
  // -------------------------------------------------------------------------
  const activeGhosts = intermediateState.lifecycle.ghosts.filter((g) => g.expiresAtSimMinute > currentMinute);

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
          nextSeq++
        )
      );
    }
  }

  // Finalize RNG snapshot and return complete updated state
  const rngSnap = rng.snapshot();

  const finalState: WorldState = {
    ...intermediateState,
    clock: {
      ...intermediateState.clock,
      simMinute: currentMinute,
      isPaused: intermediateState.livingCatIds.length === 0,
    },
    rng: {
      seed: rngSnap.seed,
      counter: rngSnap.drawCount,
      serializedState: rng.serialize(),
    },
    selectedCatId: intermediateState.selectedCatId,
    livingCatIds: intermediateState.livingCatIds,
    cats: intermediateState.cats,
    lifecycle: {
      ...intermediateState.lifecycle,
      pregnancies: intermediateState.lifecycle.pregnancies,
      memorials: memorialsMap,
      ghosts: activeGhosts,
    },
    events: [...intermediateState.events, ...newEvents].slice(-MAX_EVENTS_LOG_SIZE),
    nextEventSequence: nextSeq,
  };

  assertInvariants(finalState);
  return finalState;
}
