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
    name: 'TGA 잔고',
    label: 'Treasury General Account',
    description: '미국 재무부가 Fed에 보유한 정부 운영 계좌 잔고',
    source: 'FRED WTREGEN',
    frequency: '주간',
    impact: '상승 시 시장 유동성 감소',
    risingImpact: 'negative',
    seriesId: 'WTREGEN',
    scale: 1 / 1000,
  },
  {
    id: 'rrp',
    name: '역레포 잔고',
    label: 'Reverse Repo',
    description: '금융기관들이 Fed에 단기로 맡긴 자금',
    source: 'FRED RRPONTSYD',
    frequency: '영업일',
    impact: '상승 시 시장 유동성 감소',
    risingImpact: 'negative',
    seriesId: 'RRPONTSYD',
    scale: 1,
  },
  {
    id: 'reserves',
    name: '지급준비금',
    label: 'Reserve Balances',
    description: '예금기관이 Federal Reserve Banks에 보유한 준비금 잔고',
    source: 'FRED WRESBAL',
    frequency: '주간',
    impact: '상승 시 시장 유동성 증가',
    risingImpact: 'positive',
    seriesId: 'WRESBAL',
    scale: 1 / 1000,
  },
  {
    id: 'soma',
    name: 'SOMA 계정',
    label: 'Securities Held Outright',
    description: 'Fed가 보유한 증권 규모',
    source: 'FRED WSHOSHO',
    frequency: '주간',
    impact: '상승 시 유동성 공급 증가',
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
