/**
 * Utility-Based Cat Autonomy System
 *
 * Evaluates needs, traits, relationships, and objects in the environment
 * to generate meaningful autonomous choices when a cat is idle.
 */

import { SeededRng } from '../rng';
import { ActionQueueItem, CatRecord, WorldLot, WorldState } from '../state';
import { createAction } from './actions';
import { cellKey, findPath } from './navigation';

export interface AutonomousDecision {
  shouldAct: boolean;
  action?: ActionQueueItem;
  reason?: string;
}

export function evaluateCatAutonomy(
  cat: CatRecord,
  state: WorldState,
  rng: SeededRng
): AutonomousDecision {
  // If cat already has an active action, do not interrupt
  if (cat.currentAction !== null || cat.actionQueue.length > 0 || cat.lifeStatus !== 'living') {
    return { shouldAct: false };
  }

  const lot = state.building.lots[cat.position.lotId];
  if (!lot) {
    return { shouldAct: false };
  }

  const { hunger, hygiene, energy, fun, social, comfort } = cat.needs;
  const traits = cat.traits;

  // Utility scoring
  type Option = { type: string; score: number; targetId?: string; targetPos?: { x: number; y: number } };
  const options: Option[] = [];

  // 1. Hunger
  if (hunger < 50) {
    let score = (50 - hunger) * 2;
    if (traits.includes('glutton')) score += 20;
    if (hunger <= 20) score += 30; // emergency
    // Find food bowl
    const bowl = lot.objects.find((o) => o.category === 'care' && o.name.toLowerCase().includes('bowl'));
    options.push({
      type: 'eat',
      score,
      targetId: bowl?.id,
      targetPos: bowl ? { x: bowl.x, y: bowl.y } : undefined,
    });
  }

  // 2. Energy / Sleep
  if (energy < 40) {
    let score = (40 - energy) * 2;
    if (traits.includes('lazy')) score += 15;
    if (energy <= 15) score += 35;
    const bed = lot.objects.find((o) => o.category === 'sleep');
    options.push({
      type: 'sleep',
      score,
      targetId: bed?.id,
      targetPos: bed ? { x: bed.x, y: bed.y } : undefined,
    });
  }

  // 3. Hygiene / Litter
  if (hygiene < 45) {
    let score = (45 - hygiene) * 2;
    const litter = lot.objects.find((o) => o.category === 'care' && o.name.toLowerCase().includes('litter'));
    options.push({
      type: 'litter',
      score,
      targetId: litter?.id,
      targetPos: litter ? { x: litter.x, y: litter.y } : undefined,
    });
    // Self-grooming option
    options.push({
      type: 'groom',
      score: score * 0.7,
    });
  }

  // 4. Fun / Scratch / Play
  if (fun < 55) {
    let score = (55 - fun) * 1.5;
    if (traits.includes('playful')) score += 20;
    const scratcher = lot.objects.find((o) => o.category === 'play' || o.name.toLowerCase().includes('scratch'));
    options.push({
      type: 'scratch',
      score,
      targetId: scratcher?.id,
      targetPos: scratcher ? { x: scratcher.x, y: scratcher.y } : undefined,
    });
    options.push({
      type: 'play',
      score: score * 0.9,
    });
  }

  // 5. Social / Autonomous Romance
  if (cat.lifeStage === 'adult' && cat.moodScore >= 60 && energy >= 35 && social >= 35) {
    // Check if another adult cat is on the same lot with mutual love
    for (const otherCatId of state.livingCatIds) {
      if (otherCatId === cat.id) continue;
      const other = state.cats[otherCatId];
      if (
        other &&
        other.lifeStatus === 'living' &&
        other.lifeStage === 'adult' &&
        other.position.lotId === cat.position.lotId &&
        other.moodScore >= 60 &&
        other.needs.energy >= 35 &&
        other.needs.social >= 35
      ) {
        const rel1 = cat.relationships[otherCatId];
        const rel2 = other.relationships[cat.id];
        const mutualLove = rel1?.isLove && rel2?.isLove && rel1.romance >= 70 && rel2.romance >= 70;
        if (mutualLove) {
          options.push({
            type: 'moo_moo',
            score: 75,
            targetId: otherCatId,
            targetPos: { x: other.position.x, y: other.position.y },
          });
        }
      }
    }
  }

  // 6. Idle wandering if relaxed
  if (options.length === 0) {
    // Wander to a random adjacent cell within lot
    const candidates = [
      { x: cat.position.x + 1, y: cat.position.y },
      { x: cat.position.x - 1, y: cat.position.y },
      { x: cat.position.x, y: cat.position.y + 1 },
      { x: cat.position.x, y: cat.position.y - 1 },
    ].filter((c) => {
      const key = cellKey(c.x, c.y);
      return (
        c.x >= 0 &&
        c.x < lot.width &&
        c.y >= 0 &&
        c.y < lot.height &&
        !lot.blockedCells.includes(key)
      );
    });

    if (candidates.length > 0) {
      const targetPos = rng.drawChoice(candidates, 'autonomy_wander', state.clock.simMinute);
      options.push({
        type: 'move',
        score: 10,
        targetPos,
      });
    }
  }

  if (options.length === 0) {
    return { shouldAct: false };
  }

  // Sort descending by score
  options.sort((a, b) => b.score - a.score);
  const best = options[0];

  const action = createAction({
    type: best.type,
    targetId: best.targetId,
    targetPosition: best.targetPos,
    autonomous: true,
  });

  return {
    shouldAct: true,
    action,
    reason: `Autonomous decision: ${best.type} (score ${Math.round(best.score)})`,
  };
}
