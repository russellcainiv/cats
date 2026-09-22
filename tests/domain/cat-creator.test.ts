// tests/domain/cat-creator.test.ts
// CATS-5: Create real or imaginary cats (R04, R07, R20).
import { describe, it, expect } from 'vitest';
import { dispatch } from '@/domain/commands';
import { SCHEMA_VERSION, migrateEnvelope, computeChecksum, validateEnvelope } from '@/domain/save-schema';
import { defaultCats, defaultHome } from '@/domain/save-schema';
import { catCatalog } from '@/content/cat-catalog';
import type { WorldState, Cat } from '@/domain/state';

function emptyState(): WorldState {
  return {
    household: {
      id: 'test-hh',
      ownerId: 'test-owner',
      name: 'Test Home',
      seed: 'test-seed',
      revision: 1,
      createdAt: Date.now(),
      launched: true,
      leaseEpoch: 0,
    },
    cats: {},
    home: defaultHome('test-seed'),
    simMinute: 0,
    paused: false,
  };
}

describe('cat creator — domain', () => {
  it('creates a cat with canonical appearance and traits', () => {
    const state = emptyState();
    const result = dispatch(state, {
      type: 'create-cat',
      payload: {
        name: 'Luna',
        appearance: { variant: 'orange-tabby' },
        traits: [{ id: 'playful', level: 80 }],
      },
    }, { actorId: 'test-owner', commandId: 'cmd-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const catIds = Object.keys(result.state.cats);
    expect(catIds).toHaveLength(1);
    const cat = result.state.cats[catIds[0]];
    expect(cat.name).toBe('Luna');
    expect(cat.appearance.variant).toBe('orange-tabby');
    expect(cat.traits[0].id).toBe('playful');
    expect(result.events[0].type).toBe('cat-created');
  });

  it('enforces capacity — tenth creation is rejected (CATS-5 R20)', () => {
    const state = emptyState();
    let current = state;
    // 8 living cats plus reserved unborn slot = 9 total capacity.
    for (let i = 0; i < 9; i++) {
      const result = dispatch(current, {
        type: 'create-cat',
        payload: {
          name: `Cat ${i}`,
          appearance: { variant: 'orange-tabby' },
          traits: [],
        },
      }, { actorId: 'test-owner', commandId: `cmd-${i}` });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      current = result.state;
    }

    // Tenth attempt should fail (capacity-exceeded).
    const tenth = dispatch(current, {
      type: 'create-cat',
      payload: {
        name: 'Tenth Cat',
        appearance: { variant: 'orange-tabby' },
        traits: [],
      },
    }, { actorId: 'test-owner', commandId: 'cmd-10' });
    expect(tenth.ok).toBe(false);
    if (tenth.ok) return;
    expect(tenth.error.code).toBe('capacity-exceeded');
    // No new cat added — ninth creation changed nothing.
    expect(Object.keys(tenth.state.cats)).toHaveLength(9);
  });

  it('rejects blank names', () => {
    const state = emptyState();
    const result = dispatch(state, {
      type: 'create-cat',
      payload: {
        name: '',
        appearance: { variant: 'orange-tabby' },
        traits: [],
      },
    }, { actorId: 'test-owner', commandId: 'cmd-blank' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid-name');
  });

  it('rejects names that are only whitespace', () => {
    const state = emptyState();
    const result = dispatch(state, {
      type: 'create-cat',
      payload: {
        name: '   ',
        appearance: { variant: 'orange-tabby' },
        traits: [],
      },
    }, { actorId: 'test-owner', commandId: 'cmd-ws' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid-name');
  });

  it('supports Unicode names', () => {
    const state = emptyState();
    const result = dispatch(state, {
      type: 'create-cat',
      payload: {
        name: 'ねこちゃん',
        appearance: { variant: 'black-tuxedo' },
        traits: [{ id: 'lazy', level: 60 }],
      },
    }, { actorId: 'test-owner', commandId: 'cmd-uni' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cat = Object.values(result.state.cats)[0];
    expect(cat.name).toBe('ねこちゃん');
  });

  it('validates appearance variant against catalog', () => {
    const state = emptyState();
    const result = dispatch(state, {
      type: 'create-cat',
      payload: {
        name: 'BadCat',
        appearance: { variant: 'nonexistent-variant' },
        traits: [],
      },
    }, { actorId: 'test-owner', commandId: 'cmd-bad' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unknown-appearance');
  });

  it('validates trait IDs against catalog', () => {
    const state = emptyState();
    const result = dispatch(state, {
      type: 'create-cat',
      payload: {
        name: 'BadTrait',
        appearance: { variant: 'orange-tabby' },
        traits: [{ id: 'nonexistent-trait', level: 50 }],
      },
    }, { actorId: 'test-owner', commandId: 'cmd-badtrait' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unknown-trait');
  });

  it('enforces max 3 traits per cat', () => {
    const state = emptyState();
    const result = dispatch(state, {
      type: 'create-cat',
      payload: {
        name: 'OverTrait',
        appearance: { variant: 'orange-tabby' },
        traits: [
          { id: 'playful', level: 80 },
          { id: 'lazy', level: 60 },
          { id: 'affectionate', level: 70 },
          { id: 'curious', level: 50 },
        ],
      },
    }, { actorId: 'test-owner', commandId: 'cmd-4traits' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('too-many-traits');
  });

  it('generates a stable UUID for each new cat', () => {
    const state = emptyState();
    const result = dispatch(state, {
      type: 'create-cat',
      payload: {
        name: 'UUID Cat',
        appearance: { variant: 'gray-tabby' },
        traits: [],
      },
    }, { actorId: 'test-owner', commandId: 'cmd-uuid' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const catId = Object.keys(result.state.cats)[0];
    expect(catId).toMatch(/^[0-9a-f-]+$/);
    expect(catId).toHaveLength(36);
  });
});

describe('cat creator — schema & catalog', () => {
  it('catalog has at least 6 coat variants', () => {
    expect(catCatalog.appearances.length).toBeGreaterThanOrEqual(6);
  });

  it('catalog has at least 5 trait definitions', () => {
    expect(catCatalog.traits.length).toBeGreaterThanOrEqual(5);
  });

  it('every appearance has required fields', () => {
    for (const a of catCatalog.appearances) {
      expect(a.variant).toBeDefined();
      expect(typeof a.variant).toBe('string');
      expect(a.label).toBeDefined();
    }
  });

  it('every trait has required fields', () => {
    for (const t of catCatalog.traits) {
      expect(t.id).toBeDefined();
      expect(t.label).toBeDefined();
      expect(t.description).toBeDefined();
    }
  });

  it('cat emoji mapping exists for each appearance variant', () => {
    for (const a of catCatalog.appearances) {
      expect(catCatalog.appearanceEmoji[a.variant]).toBeDefined();
    }
  });
});
