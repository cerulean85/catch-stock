import 'server-only';
import pLimit from 'p-limit';
import sp500 from '@/shared/constants/sp500.json';
import { fetchDailyBars, fetchMonthlyBars } from '@/shared/lib/yahoo';
import { screenOne } from '../model/screener';
import {
  DEFAULT_FILTERS,
  type ScreenerItem,
  type ScreenerResult,
  type SkippedTicker,
  type Sp500Ticker,
} from '../model/types';

const TTL_MS = 15 * 60 * 1000;
const CONCURRENCY = 10;

interface CacheEntry {
  at: number;
  result: ScreenerResult;
}

type GlobalWithCache = typeof globalThis & {
  __screenerCache?: CacheEntry | null;
};

function readCache(): CacheEntry | null {
  return (globalThis as GlobalWithCache).__screenerCache ?? null;
}

function writeCache(entry: CacheEntry | null): void {
  (globalThis as GlobalWithCache).__screenerCache = entry;
}

const tickers: Sp500Ticker[] = sp500 as Sp500Ticker[];

export async function getScreenerResult(opts: { refresh?: boolean } = {}): Promise<ScreenerResult> {
  const cached = readCache();
  if (!opts.refresh && cached && Date.now() - cached.at < TTL_MS) {
    return {
      ...cached.result,
      cache: { hit: true, ttlSeconds: Math.floor((TTL_MS - (Date.now() - cached.at)) / 1000) },
    };
  }

  const limit = pLimit(CONCURRENCY);
  const items: ScreenerItem[] = [];
  const skipped: SkippedTicker[] = [];

  await Promise.all(
    tickers.map((ticker) =>
      limit(async () => {
        try {
          const [daily, monthly] = await Promise.all([
            fetchDailyBars(ticker.symbol),
            fetchMonthlyBars(ticker.symbol),
          ]);
          const out = screenOne({ ticker, daily, monthly });
          if (out.kind === 'kept') items.push(out.item);
          else if (out.kind === 'skipped') skipped.push(out.skipped);
        } catch {
          skipped.push({ symbol: ticker.symbol, reason: 'fetch_failed' });
        }
      }),
    ),
  );

  items.sort((a, b) => b.monthlyRSI14 - a.monthlyRSI14);

  const result: ScreenerResult = {
    generatedAt: new Date().toISOString(),
    cache: { hit: false, ttlSeconds: Math.floor(TTL_MS / 1000) },
    filters: DEFAULT_FILTERS,
    items,
    skipped,
  };

  writeCache({ at: Date.now(), result });
  return result;
}
