import { describe, expect, it } from 'vitest';
import { createCatRecord, validateCatName } from '../../../src/domain/core/cat';
import { dispatch } from '../../../src/domain/commands';
import { buildScenario } from '../../../src/domain/scenarios';
import { MAX_LIVING_CATS_CAPACITY, SIM_MINUTES_PER_DAY, STAGE_DAYS } from '../../../src/domain/state';

describe('Cat Creator & Traits', () => {
  it('validates cat names including Unicode support and trims whitespace', () => {
    expect(validateCatName('  Mochi  ').trimmedName).toBe('Mochi');
    expect(validateCatName('もち').valid).toBe(true);
    expect(validateCatName('   ').valid).toBe(false);
    expect(validateCatName('').valid).toBe(false);
  });

  it('creates a complete cat record with default appearance and personality traits', () => {
    const cat = createCatRecord({
      householdId: 'hh_test',
      name: 'Luna',
      appearance: {
        breed: 'siamese',
        primaryColor: '#F5E6D3',
        pattern: 'pointed',
        eyeColor: 'blue',
        bodyType: 'petite',
      },
      traits: ['curious', 'vocal'],
    });

    expect(cat.name).toBe('Luna');
    expect(cat.lifeStatus).toBe('living');
    expect(cat.lifeStage).toBe('kitten');
    expect(cat.appearance.breed).toBe('siamese');
    expect(cat.traits).toEqual(['curious', 'vocal']);
    expect(cat.needs.hunger).toBe(85);
    expect(cat.needs.health).toBe(100);
    expect(cat.moodScore).toBeGreaterThan(70);
  });

  it('determines life stages accurately across fixed 150-sim-day lifespan', () => {
    // Kitten: 0 - 10 days
    const kitten = createCatRecord({
      householdId: 'hh_test',
      name: 'Kitten',
      appearance: { breed: 'calico', primaryColor: '#FFF', pattern: 'calico', eyeColor: 'green', bodyType: 'petite' },
      traits: ['playful'],
      ageMinutes: 5 * SIM_MINUTES_PER_DAY,
    });
    expect(kitten.lifeStage).toBe('kitten');

    // Adolescent: 10 - 30 days
    const adolescent = createCatRecord({
      householdId: 'hh_test',
      name: 'Adolescent',
      appearance: { breed: 'calico', primaryColor: '#FFF', pattern: 'calico', eyeColor: 'green', bodyType: 'average' },
      traits: ['playful'],
      ageMinutes: 15 * SIM_MINUTES_PER_DAY,
    });
    expect(adolescent.lifeStage).toBe('adolescent');

    // Adult: 30 - 125 days
    const adult = createCatRecord({
      householdId: 'hh_test',
      name: 'Adult',
      appearance: { breed: 'calico', primaryColor: '#FFF', pattern: 'calico', eyeColor: 'green', bodyType: 'average' },
      traits: ['playful'],
      ageMinutes: 50 * SIM_MINUTES_PER_DAY,
    });
    expect(adult.lifeStage).toBe('adult');

    // Elder: 125 - 150 days
    const elder = createCatRecord({
      householdId: 'hh_test',
      name: 'Elder',
      appearance: { breed: 'calico', primaryColor: '#FFF', pattern: 'calico', eyeColor: 'green', bodyType: 'average' },
      traits: ['lazy'],
      ageMinutes: 130 * SIM_MINUTES_PER_DAY,
    });
    expect(elder.lifeStage).toBe('elder');
  });

  it('strictly enforces the 8-cat living capacity limit upon creation (R20)', () => {
    const state = buildScenario('capacity-limit');
    expect(state.livingCatIds.length).toBe(7);

    // 8th cat creation succeeds
    const res8 = dispatch(
      state,
      {
        type: 'CREATE_CAT',
        payload: {
          name: 'Cat 8',
          appearance: { breed: 'calico', primaryColor: '#FFF', pattern: 'solid', eyeColor: 'green', bodyType: 'petite' },
          traits: ['playful'],
        },
      },
      { actorId: 'player', commandId: 'cmd_cat_8' }
    );
    expect(res8.ok).toBe(true);
    expect(res8.state.livingCatIds.length).toBe(8);

    // 9th cat creation fails with CAPACITY_EXCEEDED
    const res9 = dispatch(
      res8.state,
      {
        type: 'CREATE_CAT',
        payload: {
          name: 'Cat 9',
          appearance: { breed: 'calico', primaryColor: '#FFF', pattern: 'solid', eyeColor: 'green', bodyType: 'petite' },
          traits: ['playful'],
        },
      },
      { actorId: 'player', commandId: 'cmd_cat_9' }
    );
    expect(res9.ok).toBe(false);
    if (!res9.ok) {
      expect(res9.error.code).toBe('CAPACITY_EXCEEDED');
      expect(res9.state.livingCatIds.length).toBe(8);
    }
  });
});
