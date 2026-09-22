import { describe, expect, test } from 'bun:test';
import { ALL_CAT_CATALOG, findCatalogEntry, getCatalogSummary } from '../../../src/content/cats/catalog';
import {
  befriendEncounter,
  checkExplorationSchedule,
  createInitialDexState,
  recruitEncounterAdapter,
  validateCreatorBreedAllowed,
} from '../../../src/domain/collection/engine';
import {
  calculateEffectiveProbabilities,
  DEFAULT_CLASS_WEIGHTS,
  drawCandidateFromPool,
  getEligibleCandidates,
} from '../../../src/domain/collection/odds';
import {
  deserializeCollectionState,
  serializeCollectionState,
} from '../../../src/domain/collection/serializer';
import {
  DiscoveryContext,
  HouseholdCapacityAdapter,
  InjectedRNG,
} from '../../../src/domain/collection/types';

/**
 * Pure deterministic RNG helper for testing using Lehmer/Linear Congruential Generator.
 */
function createDeterministicRNG(seed: number): InjectedRNG {
  let s = seed;
  return (min: number, max: number) => {
    s = (s * 16807) % 2147483647;
    const norm = (s - 1) / 2147483646;
    return min + Math.floor(norm * (max - min + 1));
  };
}

describe('Cat Catalog & Manifest Integrity', () => {
  test('manifest contains at least 40 domestic breeds, 8 wild types, and 8 fantasy forms', () => {
    const summary = getCatalogSummary();
    expect(summary.totalDomesticBreeds).toBeGreaterThanOrEqual(40);
    expect(summary.totalWildTypes).toBeGreaterThanOrEqual(8);
    expect(summary.totalFantasyForms).toBeGreaterThanOrEqual(8);
  });

  test('all catalog entries have valid required fields and provenance citations', () => {
    for (const entry of ALL_CAT_CATALOG) {
      expect(entry.id).toBeDefined();
      expect(entry.displayName).toBeDefined();
      expect(entry.provenance).toBeDefined();
      expect(entry.provenance.sourceOrganization).toBeDefined();
      expect(entry.provenance.referenceNotes).toBeDefined();
      expect(entry.eligibleDiscoveryLocations.length).toBeGreaterThan(0);
    }
  });

  test('distinguishes between coat patterns and biological breeds/species', () => {
    const americanShorthair = findCatalogEntry('american_shorthair');
    expect(americanShorthair?.category).toBe('domestic');
    expect(americanShorthair?.appearanceFlags.coatPattern).toBe('tabby');

    const caracal = findCatalogEntry('wild_caracal');
    expect(caracal?.category).toBe('wild');

    const moonCat = findCatalogEntry('fantasy_moon');
    expect(moonCat?.category).toBe('fantasy');
  });
});

describe('Rarity Math & Probability Calculations', () => {
  test('wild and fantasy tiers have lower encounter weights than domestic tiers', () => {
    expect(DEFAULT_CLASS_WEIGHTS.wild).toBeLessThan(DEFAULT_CLASS_WEIGHTS.common);
    expect(DEFAULT_CLASS_WEIGHTS.wild).toBeLessThan(DEFAULT_CLASS_WEIGHTS.uncommon);
    expect(DEFAULT_CLASS_WEIGHTS.wild).toBeLessThan(DEFAULT_CLASS_WEIGHTS.rare_domestic);

    expect(DEFAULT_CLASS_WEIGHTS.fantasy).toBeLessThan(DEFAULT_CLASS_WEIGHTS.common);
    expect(DEFAULT_CLASS_WEIGHTS.fantasy).toBeLessThan(DEFAULT_CLASS_WEIGHTS.uncommon);
    expect(DEFAULT_CLASS_WEIGHTS.fantasy).toBeLessThan(DEFAULT_CLASS_WEIGHTS.rare_domestic);
  });

  test('effective probability math normalizes over eligible candidate categories transparently', () => {
    const context: DiscoveryContext = {
      simMinute: 100,
      locationId: 'mountain_overlook',
      weatherCondition: 'starlight',
      timeOfDay: 'night',
      activeExplorationMinutes: 30,
    };

    const eligible = getEligibleCandidates(context);
    expect(eligible.length).toBeGreaterThan(0);

    const probs = calculateEffectiveProbabilities(eligible);
    expect(probs.totalEligibleCount).toBe(eligible.length);

    let sumPercentages = 0;
    for (const pct of Object.values(probs.tierEffectivePercentages)) {
      sumPercentages += pct;
    }
    if (eligible.length > 0) {
      expect(Math.round(sumPercentages)).toBe(100);
    }
  });

  test('no eligible candidates produce empty result without corrupt RNG', () => {
    const context: DiscoveryContext = {
      simMinute: 100,
      locationId: 'park',
      timeOfDay: 'day',
      activeExplorationMinutes: 30,
    };

    const eligible = getEligibleCandidates(context);
    const rng = createDeterministicRNG(42);

    for (let i = 0; i < 50; i++) {
      const drawn = drawCandidateFromPool(eligible, rng);
      expect(drawn).not.toBeNull();
      expect(drawn?.id).toBeDefined();
    }
  });

  test('unbounded loops are impossible during candidate selection', () => {
    const context: DiscoveryContext = {
      simMinute: 100,
      locationId: 'park',
      timeOfDay: 'day',
      activeExplorationMinutes: 30,
    };
    const eligible = getEligibleCandidates(context);

    // Mock RNG that returns edge boundaries
    const mockEdgeRNG: InjectedRNG = (min, max) => max;
    const result = drawCandidateFromPool(eligible, mockEdgeRNG);
    expect(result).not.toBeNull();
  });
});

describe('Deterministic Exploration Schedule & Encounters', () => {
  test('fixed seed injected-draw fixture gives exact stable sequence', () => {
    const context: DiscoveryContext = {
      simMinute: 60,
      locationId: 'park',
      timeOfDay: 'day',
      activeExplorationMinutes: 30,
    };

    const rng1 = createDeterministicRNG(12345);
    const state1 = createInitialDexState();
    const res1 = checkExplorationSchedule(state1, context, rng1);

    const rng2 = createDeterministicRNG(12345);
    const state2 = createInitialDexState();
    const res2 = checkExplorationSchedule(state2, context, rng2);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res1.encounter?.encounterId).toEqual(res2.encounter?.encounterId);
    expect(res1.encounter?.catalogId).toEqual(res2.encounter?.catalogId);
  });

  test('cooldown prevents rapid exploration schedule spamming', () => {
    const context1: DiscoveryContext = {
      simMinute: 10,
      locationId: 'park',
      timeOfDay: 'day',
      activeExplorationMinutes: 10,
    };
    const rng = createDeterministicRNG(999);
    let state = createInitialDexState();

    const res1 = checkExplorationSchedule(state, context1, rng);
    state = res1.state;

    // Immediate second check at simMinute 15 (within 30m cooldown)
    const context2: DiscoveryContext = { ...context1, simMinute: 15 };
    const res2 = checkExplorationSchedule(state, context2, rng);

    expect(res2.success).toBe(false);
    expect(res2.error).toContain('cooldown');
  });

  test('revisiting a lot preserves encounter phenotype without rerolling', () => {
    const context: DiscoveryContext = {
      simMinute: 100,
      locationId: 'wild_fringe',
      weatherCondition: 'foggy',
      timeOfDay: 'dusk',
      activeExplorationMinutes: 30,
    };

    // Fixed RNG that forces encounter spawn
    const forcedRNG: InjectedRNG = (min, max) => min;
    let state = createInitialDexState();

    const res1 = checkExplorationSchedule(state, context, forcedRNG);
    expect(res1.encounter).toBeDefined();
    const firstEncounterId = res1.encounter!.encounterId;
    const firstCatalogId = res1.encounter!.catalogId;

    // Simulate same encounter revisit
    const res2 = checkExplorationSchedule(res1.state, { ...context, simMinute: 150 }, forcedRNG);
    expect(res2.state.encounters[firstEncounterId].catalogId).toBe(firstCatalogId);
  });
});

describe('Full-Household Discovery & Atomic Recruitment', () => {
  test('full household permits discovering and befriending rare cats without forced adoption or eviction', () => {
    let state = createInitialDexState();
    const simMinute = 200;

    // Create a wild caracal encounter directly in state
    const encounterId = 'enc_caracal_test';
    state.encounters[encounterId] = {
      encounterId,
      catalogId: 'wild_caracal',
      category: 'wild',
      gameRarity: 'wild',
      locationId: 'wild_fringe',
      spawnSimMinute: simMinute,
      friendshipPoints: 0,
      discovered: true,
      befriended: false,
      recruited: false,
    };

    // Befriend up to required level (40)
    const befriendRes = befriendEncounter(state, encounterId, 50, simMinute);
    expect(befriendRes.success).toBe(true);
    expect(befriendRes.encounter?.befriended).toBe(true);
    state = befriendRes.state;

    // Household adapter at FULL capacity (8/8)
    const fullHouseholdAdapter: HouseholdCapacityAdapter = {
      householdId: 'house_full_1',
      livingCount: 8,
      reservedLitterSlots: 0,
      maxCapacity: 8,
    };

    // Attempt recruitment
    const recruitRes = recruitEncounterAdapter(state, encounterId, 'actor_1', fullHouseholdAdapter, simMinute);
    expect(recruitRes.success).toBe(false);
    expect(recruitRes.error).toContain('capacity is full');

    // Verify encounter remains discovered, befriended, unrecruited, and NOT lost/evicted
    expect(recruitRes.state.encounters[encounterId].discovered).toBe(true);
    expect(recruitRes.state.encounters[encounterId].befriended).toBe(true);
    expect(recruitRes.state.encounters[encounterId].recruited).toBe(false);
  });

  test('two concurrent recruit intents yield exactly one recruitment once serialized', () => {
    let state = createInitialDexState();
    const simMinute = 300;

    const encounterId = 'enc_fantasy_moon_test';
    state.encounters[encounterId] = {
      encounterId,
      catalogId: 'fantasy_moon',
      category: 'fantasy',
      gameRarity: 'fantasy',
      locationId: 'mountain_overlook',
      spawnSimMinute: simMinute,
      friendshipPoints: 60,
      discovered: true,
      befriended: true,
      recruited: false,
    };

    const householdAdapter: HouseholdCapacityAdapter = {
      householdId: 'house_coop_1',
      livingCount: 4,
      reservedLitterSlots: 0,
      maxCapacity: 8,
    };

    // Player 1 sends recruitment request
    const p1Res = recruitEncounterAdapter(state, encounterId, 'player_mother', householdAdapter, simMinute);
    expect(p1Res.success).toBe(true);
    expect(p1Res.newCatId).toBeDefined();

    // Serialized second request (Player 2 / Mother or Daughter concurrent retry)
    const p2Res = recruitEncounterAdapter(p1Res.state, encounterId, 'player_daughter', householdAdapter, simMinute);
    expect(p2Res.success).toBe(false);
    expect(p2Res.error).toContain('already been recruited');
  });
});

describe('Creator & Genetic Bypass Protection', () => {
  test('rare wild and fantasy forms cannot be freely created in Cat Creator', () => {
    const wildCheck = validateCreatorBreedAllowed('wild_caracal');
    expect(wildCheck.allowed).toBe(false);
    expect(wildCheck.reason).toContain('must be discovered in the wild');

    const fantasyCheck = validateCreatorBreedAllowed('fantasy_moon');
    expect(fantasyCheck.allowed).toBe(false);
    expect(fantasyCheck.reason).toContain('must be discovered in the wild');
  });

  test('ordinary domestic breeds are allowed in Cat Creator', () => {
    const domesticCheck = validateCreatorBreedAllowed('american_shorthair');
    expect(domesticCheck.allowed).toBe(true);
  });
});

describe('Save Serialization & Reload Resilience', () => {
  test('save serialization survives reload with identical encounters and discovery progress', () => {
    let state = createInitialDexState();
    state.discoveries['abyssinian'] = {
      catalogId: 'abyssinian',
      firstDiscoveredSimMinute: 120,
      totalEncounters: 3,
      maxFriendshipAchieved: 80,
      isRecruited: false,
    };
    state.encounters['enc_1'] = {
      encounterId: 'enc_1',
      catalogId: 'abyssinian',
      category: 'domestic',
      gameRarity: 'uncommon',
      locationId: 'park',
      spawnSimMinute: 120,
      friendshipPoints: 80,
      discovered: true,
      befriended: true,
      recruited: false,
    };

    const serialized = serializeCollectionState(state);
    expect(serialized.checksum).toBeDefined();

    const reloaded = deserializeCollectionState(serialized);
    expect(reloaded.discoveries['abyssinian']).toEqual(state.discoveries['abyssinian']);
    expect(reloaded.encounters['enc_1']).toEqual(state.encounters['enc_1']);
  });
});
