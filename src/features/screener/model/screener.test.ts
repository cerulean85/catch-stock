import { describe, it, expect } from 'vitest';
import { screenOne } from './screener';
import type { Sp500Ticker } from './types';

const ticker: Sp500Ticker = { symbol: 'TEST', name: 'Test Co.', sector: 'Tech' };

function uptrend(n: number, start = 10): number[] {
  return Array.from({ length: n }, (_, i) => start + i);
}

function downtrend(n: number, start = 100): number[] {
  return Array.from({ length: n }, (_, i) => start - i);
}

describe('screenOne', () => {
  it('skips tickers missing daily bars', () => {
    const out = screenOne({ ticker, daily: null, monthly: null });
    expect(out.kind).toBe('skipped');
    if (out.kind === 'skipped') expect(out.skipped.reason).toBe('insufficient_daily');
  });

  it('keeps a ticker satisfying monthly and 3-day daily RSI uptrend conditions', () => {
    // Daily: 3-day RSI uptrend at the end, even though latest RSI is below 50.
    const dailyMixed = [
      10, 11, 12, 11, 13, 14, 15, 16, 14, 15, 16, 17, 18, 17, 19, 16, 15, 14, 6, 7, 8, 9, 10,
    ];
    const monthlyStrongUp = uptrend(20);
    const out = screenOne({
      ticker,
      daily: { closes: dailyMixed, lastClose: 10, asOf: new Date() },
      monthly: {
        closes: monthlyStrongUp,
        lastClose: monthlyStrongUp[monthlyStrongUp.length - 1],
        asOf: new Date(),
      },
    });
    expect(out.kind).toBe('kept');
    if (out.kind === 'kept') {
      expect(out.item.symbol).toBe('TEST');
      expect(out.item.dailyRSI14).toBeLessThan(50);
      expect(out.item.monthlyRSI14).toBeGreaterThanOrEqual(70);
    }
  });

  it('rejects when monthly RSI is below 70', () => {
    const dailyMixed = [
      10, 11, 12, 11, 13, 14, 15, 16, 14, 15, 16, 17, 18, 17, 19, 16, 15, 14, 6, 7, 8, 9, 10,
    ];
    const out = screenOne({
      ticker,
      daily: { closes: dailyMixed, lastClose: 10, asOf: new Date() },
      monthly: { closes: downtrend(20), lastClose: 81, asOf: new Date() },
    });
    expect(out.kind).toBe('rejected');
  });

  it('skips when 3-day RSI uptrend is not satisfied', () => {
    // Daily: not a 3-day RSI uptrend because recent RSI values do not strictly increase.
    const dailyMixed = [
      10, 11, 12, 11, 13, 14, 15, 16, 14, 15, 16, 17, 18, 17, 19, 16, 15, 14, 15, 16, 14,
    ];
    const monthlyStrongUp = uptrend(20);
    const out = screenOne({
      ticker,
      daily: { closes: dailyMixed, lastClose: 14, asOf: new Date() },
      monthly: {
        closes: monthlyStrongUp,
        lastClose: monthlyStrongUp[monthlyStrongUp.length - 1],
        asOf: new Date(),
      },
    });
    expect(out.kind).toBe('skipped');
    if (out.kind === 'skipped') expect(out.skipped.reason).toBe('insufficient_uptrend');
  });
});
