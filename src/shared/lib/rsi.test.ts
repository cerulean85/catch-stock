import { describe, it, expect } from 'vitest';
import { rsi14, rsi14Array } from './rsi';

describe('rsi14', () => {
  it('returns null when fewer than 15 closes are provided', () => {
    expect(rsi14([])).toBeNull();
    expect(rsi14(Array.from({ length: 14 }, (_, i) => i + 1))).toBeNull();
  });

  it('returns 100 for a strict uptrend (no losses)', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 10 + i);
    expect(rsi14(closes)).toBe(100);
  });

  it('returns 0 for a strict downtrend (no gains)', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 50 - i);
    expect(rsi14(closes)).toBe(0);
  });

  it('returns 50 when prices are constant', () => {
    const closes = Array.from({ length: 20 }, () => 100);
    expect(rsi14(closes)).toBe(50);
  });

  it('matches a hand-computed value at the first RSI point (15 closes)', () => {
    const closes = [10, 11, 12, 11, 13, 14, 15, 16, 14, 15, 16, 17, 18, 17, 19];
    const value = rsi14(closes);
    expect(value).not.toBeNull();
    expect(value!).toBeCloseTo(76.4706, 3);
  });

  it('matches a hand-computed value after one SMMA step (16 closes)', () => {
    const closes = [10, 11, 12, 11, 13, 14, 15, 16, 14, 15, 16, 17, 18, 17, 19, 16];
    const value = rsi14(closes);
    expect(value).not.toBeNull();
    expect(value!).toBeCloseTo(64.2586, 3);
  });

  it('is bounded in [0, 100]', () => {
    const closes = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61,
      46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 45.64, 46.21, 46.25, 45.71, 46.45, 45.78, 45.35,
      44.03, 44.18, 44.22, 44.57, 43.42, 42.66, 43.13,
    ];
    const value = rsi14(closes);
    expect(value).not.toBeNull();
    expect(value!).toBeGreaterThanOrEqual(0);
    expect(value!).toBeLessThanOrEqual(100);
  });
});

describe('rsi14Array', () => {
  it('returns array of nulls when fewer than 15 closes are provided', () => {
    expect(rsi14Array([])).toEqual([]);
    expect(rsi14Array([1, 2, 3])).toEqual([null, null, null]);
  });

  it('returns first 14 values as null, then RSI values', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 10 + i);
    const result = rsi14Array(closes);
    expect(result.length).toBe(20);
    for (let i = 0; i < 14; i++) {
      expect(result[i]).toBeNull();
    }
    for (let i = 14; i < 20; i++) {
      expect(result[i]).toBe(100);
    }
  });

  it('matches rsi14 at the last position', () => {
    const closes = [10, 11, 12, 11, 13, 14, 15, 16, 14, 15, 16, 17, 18, 17, 19, 16];
    const array = rsi14Array(closes);
    const single = rsi14(closes);
    expect(array[array.length - 1]).toEqual(single);
  });

  it('shows uptrend when prices consistently increase', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 10 + i);
    const result = rsi14Array(closes);
    // Last 5 RSI values should all be 100
    for (let i = result.length - 5; i < result.length; i++) {
      expect(result[i]).toBe(100);
    }
  });
});

