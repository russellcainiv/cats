import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../../src/domain/rng';

describe('SeededRng (Deterministic PRNG)', () => {
  it('produces identical deterministic sequences from the same seed', () => {
    const rngA = new SeededRng(4242);
    const rngB = new SeededRng(4242);

    const drawsA = [
      rngA.drawFloat('test_1'),
      rngA.drawInt(1, 10, 'test_2'),
      rngA.drawBool(0.5, 'test_3'),
    ];

    const drawsB = [
      rngB.drawFloat('test_1'),
      rngB.drawInt(1, 10, 'test_2'),
      rngB.drawBool(0.5, 'test_3'),
    ];

    expect(drawsA).toEqual(drawsB);
  });

  it('serializes and deserializes accurately to continue the exact same sequence', () => {
    const rng = new SeededRng(12345);
    rng.drawFloat('first');
    rng.drawInt(1, 6, 'second');

    const serialized = rng.serialize();
    const restored = SeededRng.deserialize(serialized);

    const nextOriginal = rng.drawFloat('third');
    const nextRestored = restored.drawFloat('third');

    expect(nextOriginal).toBe(nextRestored);
    expect(restored.drawCount).toBe(rng.drawCount);
  });

  it('records draw labels and history up to maximum bounds', () => {
    const rng = new SeededRng(999);
    rng.drawFloat('conception_draw', 120);
    rng.drawInt(1, 3, 'litter_size', 120);

    expect(rng.history.length).toBe(2);
    expect(rng.history[0].label).toBe('conception_draw');
    expect(rng.history[0].simMinute).toBe(120);
    expect(rng.history[1].label).toBe('litter_size');
  });

  it('drawChoice picks deterministically from options', () => {
    const rng = new SeededRng(888);
    const options = ['apple', 'banana', 'cherry', 'date'];
    const choice = rng.drawChoice(options, 'fruit');
    expect(options).toContain(choice);
  });
});
