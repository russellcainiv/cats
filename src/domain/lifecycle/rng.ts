// src/domain/lifecycle/rng.ts
// Canonical Mulberry32 + SplitMix32 PRNG adapter for Lifecycle Subsystem.

import { RngStateData } from './types';

export interface RngDrawRecord {
  sequence: number;
  label: string;
  value: number;
  simMinute: number;
}

export interface RngStateSnapshot {
  seed: number;
  state: number;
  drawCount: number;
  history: RngDrawRecord[];
}

export class SeededRng {
  private readonly _seed: number;
  private _state: number;
  private _drawCount: number;
  private _history: RngDrawRecord[];
  private static readonly MAX_HISTORY = 64;

  constructor(seed: number = 1337, state?: number, drawCount: number = 0, history: RngDrawRecord[] = []) {
    this._seed = seed >>> 0;
    this._state = state !== undefined ? (state >>> 0) : this.hashSeed(this._seed);
    this._drawCount = drawCount;
    this._history = [...history];
  }

  /**
   * SplitMix32 hash to initialize 32-bit internal state from seed
   */
  private hashSeed(seed: number): number {
    let h = (seed + 0x6d2b79f5) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 1 | h);
    h = (h + Math.imul(h ^ (h >>> 7), 61 | h)) ^ h;
    return (h ^ (h >>> 14)) >>> 0;
  }

  /**
   * Mulberry32 step to generate next uint32 float [0, 1)
   */
  private nextRawUint32(): number {
    this._state = (this._state + 0x6d2b79f5) >>> 0;
    let z = this._state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return (z ^ (z >>> 14)) >>> 0;
  }

  /**
   * Draw next float in range [0, 1) with an event label
   */
  drawFloat(label: string = 'generic', simMinute: number = 0): number {
    const raw = this.nextRawUint32();
    const value = raw / 4294967296.0;
    this._drawCount++;
    const record: RngDrawRecord = {
      sequence: this._drawCount,
      label,
      value,
      simMinute,
    };
    this._history.push(record);
    if (this._history.length > SeededRng.MAX_HISTORY) {
      this._history.shift();
    }
    return value;
  }

  /**
   * Draw integer in range [min, max] inclusive
   */
  drawInt(min: number, max: number, label: string = 'generic', simMinute: number = 0): number {
    if (min > max) {
      const t = min;
      min = max;
      max = t;
    }
    const floatVal = this.drawFloat(label, simMinute);
    const range = max - min + 1;
    return min + Math.floor(floatVal * range);
  }

  /**
   * Draw boolean with probability chance in range [0, 1]
   */
  drawBool(probability: number, label: string = 'generic', simMinute: number = 0): boolean {
    const floatVal = this.drawFloat(label, simMinute);
    return floatVal < probability;
  }

  /**
   * Draw random element from non-empty array
   */
  drawChoice<T>(items: readonly T[], label: string = 'generic', simMinute: number = 0): T {
    if (items.length === 0) {
      throw new Error('Cannot drawChoice from empty array');
    }
    const idx = this.drawInt(0, items.length - 1, label, simMinute);
    return items[idx];
  }

  /**
   * Serialize internal state for save persistence
   */
  serialize(): string {
    return JSON.stringify({
      seed: this._seed,
      state: this._state,
      drawCount: this._drawCount,
      history: this._history,
    });
  }

  /**
   * Export snapshot
   */
  snapshot(): RngStateSnapshot {
    return {
      seed: this._seed,
      state: this._state,
      drawCount: this._drawCount,
      history: [...this._history],
    };
  }

  /**
   * Restore from serialized string or snapshot
   */
  static deserialize(data: string | RngStateSnapshot): SeededRng {
    const parsed: RngStateSnapshot = typeof data === 'string' ? JSON.parse(data) : data;
    return new SeededRng(parsed.seed, parsed.state, parsed.drawCount, parsed.history || []);
  }

  /**
   * Create an independent clone of current state
   */
  clone(): SeededRng {
    return new SeededRng(this._seed, this._state, this._drawCount, this._history);
  }

  get seed(): number {
    return this._seed;
  }

  get state(): number {
    return this._state;
  }

  get drawCount(): number {
    return this._drawCount;
  }

  get history(): readonly RngDrawRecord[] {
    return this._history;
  }
}

/**
 * Creates or restores a SeededRng from RngStateData.
 */
export function createRngAdapter(rng: RngStateData): SeededRng {
  if (rng.serializedState) {
    try {
      return SeededRng.deserialize(rng.serializedState);
    } catch {
      // Fallback
    }
  }
  const seeded = new SeededRng(rng.seed ?? 12345);
  if (rng.counter && rng.counter > 0) {
    for (let i = 0; i < rng.counter; i++) {
      seeded.drawFloat('catchup');
    }
  }
  return seeded;
}

/**
 * Converts a SeededRng back to RngStateData.
 */
export function toRngStateData(rng: SeededRng): RngStateData {
  return {
    seed: rng.seed,
    counter: rng.drawCount,
    serializedState: rng.serialize(),
  };
}

/**
 * Functional adapter returning value and updated RngStateData with canonical PRNG.
 */
export function nextRng(
  rng: RngStateData,
  label: string = 'generic',
  simMinute: number = 0
): [number, RngStateData] {
  const adapter = createRngAdapter(rng);
  const value = adapter.drawFloat(label, simMinute);
  return [value, toRngStateData(adapter)];
}
