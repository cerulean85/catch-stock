import 'server-only';
import { parseFredCsv } from '../model/parse';
import type { LiquidityMetric, LiquidityResult } from '../model/types';

const TTL_MS = 6 * 60 * 60 * 1000;
const MAX_POINTS = 180;

type FredMetricConfig = Omit<LiquidityMetric, 'latest' | 'previous' | 'points'> & {
  seriesId: string;
  scale: number;
};

interface CacheEntry {
  at: number;
  result: LiquidityResult;
}

type GlobalWithCache = typeof globalThis & {
  __liquidityCache?: CacheEntry | null;
};

const metrics: FredMetricConfig[] = [
  {
    id: 'tga',
    name: 'TGA Balance',
    label: 'Treasury General Account',
    description: 'The U.S. Treasury operating account balance held at the Fed',
    source: 'FRED WTREGEN',
    frequency: 'Weekly',
    impact: 'Rising balance reduces market liquidity',
    risingImpact: 'negative',
    seriesId: 'WTREGEN',
    scale: 1 / 1000,
  },
  {
    id: 'rrp',
    name: 'Reverse Repo Balance',
    label: 'Reverse Repo',
    description: 'Cash that financial institutions park at the Fed overnight',
    source: 'FRED RRPONTSYD',
    frequency: 'Business days',
    impact: 'Rising balance reduces market liquidity',
    risingImpact: 'negative',
    seriesId: 'RRPONTSYD',
    scale: 1,
  },
  {
    id: 'reserves',
    name: 'Reserve Balances',
    label: 'Reserve Balances',
    description: 'Balances that depository institutions hold at Federal Reserve Banks',
    source: 'FRED WRESBAL',
    frequency: 'Weekly',
    impact: 'Rising balance increases market liquidity',
    risingImpact: 'positive',
    seriesId: 'WRESBAL',
    scale: 1 / 1000,
  },
  {
    id: 'soma',
    name: 'SOMA Holdings',
    label: 'Securities Held Outright',
    description: 'Securities held outright by the Federal Reserve',
    source: 'FRED WSHOSHO',
    frequency: 'Weekly',
    impact: 'Rising holdings increase liquidity supply',
    risingImpact: 'positive',
    seriesId: 'WSHOSHO',
    scale: 1 / 1000,
  },
];

function readCache(): CacheEntry | null {
  return (globalThis as GlobalWithCache).__liquidityCache ?? null;
}

function writeCache(entry: CacheEntry | null): void {
  (globalThis as GlobalWithCache).__liquidityCache = entry;
}

export async function getLiquidityResult(
  opts: { refresh?: boolean } = {},
): Promise<LiquidityResult> {
  const cached = readCache();
  if (!opts.refresh && cached && Date.now() - cached.at < TTL_MS) {
    return {
      ...cached.result,
      cache: {
        hit: true,
        ttlSeconds: Math.floor((TTL_MS - (Date.now() - cached.at)) / 1000),
      },
    };
  }

  const hydrated = await Promise.all(metrics.map(fetchMetric));
  const result: LiquidityResult = {
    generatedAt: new Date().toISOString(),
    cache: { hit: false, ttlSeconds: Math.floor(TTL_MS / 1000) },
    unit: 'billions_usd',
    metrics: hydrated,
  };

  writeCache({ at: Date.now(), result });
  return result;
}

async function fetchMetric(config: FredMetricConfig): Promise<LiquidityMetric> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${config.seriesId}`;
  const res = await fetch(url, { next: { revalidate: Math.floor(TTL_MS / 1000) } });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${config.seriesId} (${res.status})`);
  }

  const csv = await res.text();
  const points = parseFredCsv(csv, config.scale).slice(-MAX_POINTS);
  return {
    id: config.id,
    name: config.name,
    label: config.label,
    description: config.description,
    source: config.source,
    frequency: config.frequency,
    impact: config.impact,
    risingImpact: config.risingImpact,
    latest: points.at(-1) ?? null,
    previous: points.at(-2) ?? null,
    points,
  };
}
