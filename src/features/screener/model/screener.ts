import { rsi14 } from '@/shared/lib/rsi';
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

  const dailyOk = dRsi >= filters.dailyRSI14.min && dRsi <= filters.dailyRSI14.max;
  const monthlyOk = mRsi >= filters.monthlyRSI14.min;
  if (!dailyOk || !monthlyOk) return { kind: 'rejected' };

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
