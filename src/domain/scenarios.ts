/**
 * Scenario Fixture Registry and Factory
 *
 * Produces deterministic, validated test scenarios for simulation and browser testing.
 */

import { createCatRecord } from './core/cat';
import { createStarterWorld } from './core/starter-world';
import { assertInvariants } from './invariants';
import { CatRecord, MAX_LIVING_CATS_CAPACITY, TOTAL_LIFESPAN_MINUTES, WorldState } from './state';

export type ScenarioName =
  | 'starter'
  | 'private-household'
  | 'playable-home'
  | 'capacity-limit'
  | 'death-and-memorial'
  | 'moo-moo-readiness';

export function buildScenario(name: ScenarioName): WorldState {
  switch (name) {
    case 'starter': {
      const state = createStarterWorld({
        householdId: 'hh_starter',
        householdName: 'My Cats',
        seed: 1337,
      });
      assertInvariants(state);
      return state;
    }

    case 'private-household': {
      const state = createStarterWorld({
        householdId: 'hh_private_01',
        householdName: 'Private Cats',
        seed: 42,
      });
      assertInvariants(state);
      return state;
    }

    case 'playable-home': {
      const state = createStarterWorld({
        householdId: 'hh_playable_home',
        householdName: 'Playable Home',
        seed: 100,
      });
      // Ensure Mochi is at (4, 4) with clear path to garden at (4, 2)
      const mochi = state.cats['cat_mochi'];
      if (mochi) {
        mochi.position = { lotId: 'home', x: 4, y: 4, facing: 'north' };
      }
      assertInvariants(state);
      return state;
    }

    case 'capacity-limit': {
      const state = createStarterWorld({
        householdId: 'hh_capacity_test',
        householdName: 'Full House',
        seed: 777,
      });
      // Add cats until 7 living cats exist
      while (state.livingCatIds.length < 7) {
        const i = state.livingCatIds.length + 1;
        const extraCat = createCatRecord({
          householdId: state.householdId,
          name: `Cat ${i}`,
          appearance: {
            breed: 'domestic_shorthair',
            primaryColor: '#333333',
            pattern: 'solid',
            eyeColor: 'green',
            bodyType: 'average',
          },
          traits: ['playful'],
          lifeStage: 'adult',
          createdAtSimMinute: 0,
        });
        state.cats[extraCat.id] = extraCat;
        state.livingCatIds.push(extraCat.id);
      }
      assertInvariants(state);
      return state;
    }

    case 'death-and-memorial': {
      const state = createStarterWorld({
        householdId: 'hh_memorial_test',
        householdName: 'Legacy House',
        seed: 999,
      });
      // Set Mochi as an elder near the end of fixed 150-day lifespan (216,000 minutes)
      const mochi = state.cats['cat_mochi'];
      if (mochi) {
        mochi.lifeStage = 'elder';
        mochi.ageMinutes = TOTAL_LIFESPAN_MINUTES - 10; // 10 minutes before natural death
      }
      assertInvariants(state);
      return state;
    }

    case 'moo-moo-readiness': {
      const state = createStarterWorld({
        householdId: 'hh_romance_test',
        householdName: 'Romance House',
        seed: 555,
      });
      // Create partner 'Wasabi'
      const wasabi: CatRecord = createCatRecord({
        id: 'cat_wasabi',
        householdId: state.householdId,
        name: 'Wasabi',
        appearance: {
          breed: 'siamese',
          primaryColor: '#F5E6D3',
          secondaryColor: '#333333',
          pattern: 'pointed',
          eyeColor: 'blue',
          bodyType: 'petite',
        },
        traits: ['affectionate', 'zen'],
        lifeStage: 'adult',
        createdAtSimMinute: 0,
        position: { lotId: 'home', x: 4, y: 5, facing: 'north' },
      });

      state.cats[wasabi.id] = wasabi;
      state.livingCatIds.push(wasabi.id);

      // Establish mutual love between Mochi and Wasabi
      const mochi = state.cats['cat_mochi'];
      mochi.relationships[wasabi.id] = {
        targetCatId: wasabi.id,
        friendship: 85,
        romance: 85,
        isLove: true,
        lastInteractionMinute: state.clock.simMinute,
      };
      wasabi.relationships[mochi.id] = {
        targetCatId: mochi.id,
        friendship: 85,
        romance: 85,
        isLove: true,
        lastInteractionMinute: state.clock.simMinute,
      };

      assertInvariants(state);
      return state;
    }

    default:
      throw new Error(`Unknown scenario: ${name}`);
  }
}
