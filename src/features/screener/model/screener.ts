import { rsi14, rsi14Array } from '@/shared/lib/rsi';
import type { PriceBars } from '@/shared/lib/yahoo';
import {
  DEFAULT_FILTERS,
  type ScreenerFilters,
  type ScreenerItem,
  type SkippedTicker,
  type Sp500Ticker,
} from './types';

export interface ScreenStockInput {
  ticker: Sp500Ticker;
  daily: PriceBars | null;
  monthly: PriceBars | null;
}

export type ScreenStockOutput =
  | { kind: 'kept'; item: ScreenerItem }
  | { kind: 'skipped'; skipped: SkippedTicker }
  | { kind: 'rejected' };

/**
 * Check if RSI values show consecutive uptrend for N days.
 * Returns true if the last N RSI values are all increasing (each > previous).
 */
function isConsecutiveUptrendRSI(rsiValues: (number | null)[], days: number): boolean {
  // Find the last N non-null RSI values
  const recentRsi: number[] = [];
  for (let i = rsiValues.length - 1; i >= 0 && recentRsi.length < days; i--) {
    const value = rsiValues[i];
    if (value !== null) {
      recentRsi.unshift(value);
    }
  }

  if (recentRsi.length < days) return false;

  // Check if each value is strictly greater than the previous
  for (let i = 1; i < recentRsi.length; i++) {
    if (recentRsi[i] <= recentRsi[i - 1]) {
      return false;
    }
  }

  return true;
}

export function screenOne(
  input: ScreenStockInput,
  filters: ScreenerFilters = DEFAULT_FILTERS,
): ScreenStockOutput {
  const { ticker, daily, monthly } = input;

  if (!daily) {
    return { kind: 'skipped', skipped: { symbol: ticker.symbol, reason: 'insufficient_daily' } };
  }
  if (!monthly) {
    return {
      kind: 'skipped',
      skipped: { symbol: ticker.symbol, reason: 'insufficient_monthly' },
    };
  }

  const dRsi = rsi14(daily.closes);
  const mRsi = rsi14(monthly.closes);

  if (dRsi == null) {
    return { kind: 'skipped', skipped: { symbol: ticker.symbol, reason: 'insufficient_daily' } };
  }
  if (mRsi == null) {
    return {
      kind: 'skipped',
      skipped: { symbol: ticker.symbol, reason: 'insufficient_monthly' },
    };
  }

  const monthlyOk = mRsi >= filters.monthlyRSI14.min;
  if (!monthlyOk) return { kind: 'rejected' };

  // Check configured daily RSI uptrend condition.
  const uptrendDays = filters.dailyRSI14Uptrend.days;
  const dailyRsiArray = rsi14Array(daily.closes);
  if (!isConsecutiveUptrendRSI(dailyRsiArray, uptrendDays)) {
    return {
      kind: 'skipped',
      skipped: { symbol: ticker.symbol, reason: 'insufficient_uptrend' },
    };
  }

  return {
    kind: 'kept',
    item: {
      symbol: ticker.symbol,
      name: ticker.name,
      sector: ticker.sector,
      price: round2(daily.lastClose),
      dailyRSI14: round2(dRsi),
      monthlyRSI14: round2(mRsi),
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
