// tests/domain/lifecycle/birth.test.ts
import { describe, it, expect } from 'vitest';
import { createTestWorldState, createTestCommandContext } from './harness';
import { executeBirth, processGestationTick } from '../../../src/domain/lifecycle/birth';
import { PregnancyRecord } from '../../../src/domain/lifecycle/types';

describe('Gestation & Birth Logic', () => {
  it('triggers birth successfully and adds 1-3 kittens with correct genealogy', () => {
    const world = createTestWorldState();
    const pregnancy: PregnancyRecord = {
      id: 'preg_1',
      parentIds: ['cat_dam', 'cat_sire'],
      damId: 'cat_dam',
      sireId: 'cat_sire',
      startedAtSimMinute: 0,
      dueAtSimMinute: 4320,
      reservedSlots: 2,
      conceptionEventId: 'evt_conception_1',
    };

    world.lifecycle.pregnancies['preg_1'] = pregnancy;
    world.clock.simMinute = 4320; // Gestation completed (3 sim days)

    const result = executeBirth(
      world,
      { type: 'TRIGGER_BIRTH', payload: { pregnancyId: 'preg_1', kittenNames: ['Milo', 'Luna'] } },
      createTestCommandContext()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const nextState = result.state;
    // Completed pregnancy is removed from active map so reservations release cleanly
    expect(nextState.lifecycle.pregnancies['preg_1']).toBeUndefined();
    expect(nextState.livingCatIds.length).toBe(4); // dam, sire, + 2 kittens

    const dam = nextState.cats['cat_dam'];
    expect(dam.family.childIds.length).toBe(2);

    const kitten1 = nextState.cats[dam.family.childIds[0]];
    expect(kitten1.name).toBe('Milo');
    expect(kitten1.lifeStage).toBe('kitten');
    expect(kitten1.family.sireId).toBe('cat_sire');
    expect(kitten1.family.damId).toBe('cat_dam');
    expect(kitten1.family.generation).toBe(2);
  });

  it('rejects TRIGGER_BIRTH before dueAtSimMinute with PREMATURE_GESTATION', () => {
    const world = createTestWorldState();
    const pregnancy: PregnancyRecord = {
      id: 'preg_premature',
      parentIds: ['cat_dam', 'cat_sire'],
      damId: 'cat_dam',
      sireId: 'cat_sire',
      startedAtSimMinute: 0,
      dueAtSimMinute: 4320,
      reservedSlots: 1,
      conceptionEventId: 'evt_conception_premature',
    };
    world.lifecycle.pregnancies['preg_premature'] = pregnancy;
    world.clock.simMinute = 2000; // Premature (< 4320)

    const result = executeBirth(
      world,
      { type: 'TRIGGER_BIRTH', payload: { pregnancyId: 'preg_premature' } },
      createTestCommandContext()
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('PREMATURE_GESTATION');
    }
  });

  it('cancels pregnancy and releases reserved slots if dam dies during gestation', () => {
    const world = createTestWorldState();
    const pregnancy: PregnancyRecord = {
      id: 'preg_2',
      parentIds: ['cat_dam', 'cat_sire'],
      damId: 'cat_dam',
      sireId: 'cat_sire',
      startedAtSimMinute: 0,
      dueAtSimMinute: 4320,
      reservedSlots: 3,
      conceptionEventId: 'evt_conception_2',
    };
    world.lifecycle.pregnancies['preg_2'] = pregnancy;

    // Mark dam as deceased
    world.cats['cat_dam'].lifeStatus = 'deceased';

    const { state: updatedState, events } = processGestationTick(world, 100);

    // Cancelled pregnancy is removed from active map to release reserved slots
    expect(updatedState.lifecycle.pregnancies['preg_2']).toBeUndefined();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('PREGNANCY_CANCELLED');
    expect(events[0].payload.releasedSlots).toBe(3);
  });
});
