import 'server-only';
import * as cache from './cache';
import type { Ohlcv } from '@/features/scoring/model/indicators';

/**
 * FMP(Financial Modeling Prep) 클라이언트 — 새 'stable' API 기준.
 *
 * 2025-08-31 부로 구 /api/v3 엔드포인트가 폐기되어 신규 키는 stable API 만 접근 가능.
 * stable API 는 쿼리 파라미터(?symbol=)와 갱신된 필드명을 사용한다.
 *
 * 무료 티어 콜 절약을 위해 캐시 적용. 키 없거나 실패 시 null → provider 가 yahoo 폴백.
 * inv-stds `data/fmp.py` 이식.
 */

const BASE_URL = 'https://financialmodelingprep.com/stable';
const TIMEOUT_MS = 15_000;
const CACHE_TTL_HOURS = 12; // 재무/시세 캐시 유효시간
const NEG_TTL_HOURS = 2; // 429/오류 네거티브 캐시

function apiKey(): string {
  return process.env.FMP_API_KEY ?? '';
}

export function hasKey(): boolean {
  return Boolean(apiKey());
}

async function fmpGet(
  path: string,
  params: Record<string, string> = {},
  ttlHours: number = CACHE_TTL_HOURS,
): Promise<unknown> {
  if (!hasKey()) return null;
  const sorted = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const cacheKey = `fmp:${path}:${JSON.stringify(sorted)}`;
  const cached = cache.get(cacheKey, ttlHours);
  if (cached !== null) return cached;
  // 소진된 키를 매 스크리닝마다 재호출해 지연되는 것을 막는다(한도는 일 단위 리셋).
  if (cache.missRecently(cacheKey, NEG_TTL_HOURS)) return null;

  const url = new URL(`${BASE_URL}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('apikey', apiKey());

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!resp.ok) {
      cache.markMiss(cacheKey);
      return null;
    }
    const data = await resp.json();
    // FMP 오류는 {"Error Message": ...} dict 로 옴
    if (data && typeof data === 'object' && !Array.isArray(data) && 'Error Message' in data) {
      cache.markMiss(cacheKey);
      return null;
    }
    cache.set(cacheKey, data);
    return data;
  } catch {
    cache.markMiss(cacheKey);
    return null;
  }
}

function first(data: unknown): Record<string, unknown> {
  if (Array.isArray(data) && data.length > 0) {
    return typeof data[0] === 'object' && data[0] !== null ? (data[0] as Record<string, unknown>) : {};
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return {};
}

function pick(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

export interface FmpFundamentals {
  per: number | null;
  pbr: number | null;
  roe: number | null;
  ev_ebitda: number | null;
  dividend_yield: number | null;
  debt_to_equity: number | null;
  retention: number | null;
  growth_rate: number | null;
  operating_margin: number | null;
}

/** stable ratios-ttm + key-metrics-ttm + income-statement-growth → 기준 key 매핑. */
export async function fundamentals(ticker: string): Promise<FmpFundamentals> {
  const [rRaw, kmRaw, gRaw] = await Promise.all([
    fmpGet('ratios-ttm', { symbol: ticker }),
    fmpGet('key-metrics-ttm', { symbol: ticker }),
    fmpGet('income-statement-growth', { symbol: ticker, limit: '1' }),
  ]);
  const r = first(rRaw);
  const km = first(kmRaw);
  const g = first(gRaw);

  const payout = pick(r.dividendPayoutRatioTTM);
  const retention = payout !== null ? 1 - payout : null;

  const revG = g.growthRevenue;
  const opG = g.growthOperatingIncome;
  const epsG = g.growthEPS ?? g.growthNetIncome;
  const growthVals = [revG, opG, epsG].filter((v): v is number => typeof v === 'number');
  const growth = growthVals.length ? growthVals.reduce((a, b) => a + b, 0) / growthVals.length : null;

  return {
    per: pick(r.priceToEarningsRatioTTM),
    pbr: pick(r.priceToBookRatioTTM),
    roe: pick(km.returnOnEquityTTM),
    ev_ebitda: pick(km.evToEBITDATTM),
    dividend_yield: pick(r.dividendYieldTTM),
    debt_to_equity: pick(r.debtToEquityRatioTTM),
    retention,
    growth_rate: growth,
    operating_margin: pick(r.operatingProfitMarginTTM),
  };
}

/** 애널리스트 평균 목표주가 (최근 분기 우선). */
export async function priceTarget(ticker: string): Promise<number | null> {
  const d = first(await fmpGet('price-target-summary', { symbol: ticker }));
  return pick(d.lastQuarterAvgPriceTarget, d.lastYearAvgPriceTarget, d.lastMonthAvgPriceTarget);
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** 재무제표에서 뽑은, Altman-Z·전략2 판정에 필요한 정규화 값(연간, 최신→과거 순 시계열). */
export interface FmpStatements {
  marketCap: number | null;
  totalAssets: number | null; // 최신 연도
  totalLiabilities: number | null;
  workingCapital: number | null; // 유동자산 - 유동부채
  retainedEarnings: number | null;
  ebit: number | null; // 영업이익
  revenue: number | null; // 최신 매출
  freeCashFlow: number | null; // 최신 FCF
  netIncomeHistory: number[]; // 최신→과거
  revenueHistory: number[]; // 최신→과거
}

/**
 * balance-sheet + income-statement + cash-flow(연간 최근 N) + 시가총액을 모아
 * Altman-Z / 전략2 재무건전성 판정에 필요한 값으로 정규화.
 * 무료 티어 콜을 아끼기 위해 캐시 TTL 을 재무 기본값(12h)보다 길게 잡는다(연간 데이터라 변동 느림).
 */
export async function statements(ticker: string, years = 4): Promise<FmpStatements> {
  const limit = String(Math.max(3, years));
  const [bsRaw, isRaw, cfRaw, mcRaw] = await Promise.all([
    fmpGet('balance-sheet-statement', { symbol: ticker, limit, period: 'annual' }, 48),
    fmpGet('income-statement', { symbol: ticker, limit, period: 'annual' }, 48),
    fmpGet('cash-flow-statement', { symbol: ticker, limit: '1', period: 'annual' }, 48),
    fmpGet('market-capitalization', { symbol: ticker }),
  ]);

  const bsRows = (Array.isArray(bsRaw) ? bsRaw : []) as Array<Record<string, unknown>>;
  const isRows = (Array.isArray(isRaw) ? isRaw : []) as Array<Record<string, unknown>>;
  const bs = first(bsRaw);
  const is = first(isRaw);
  const cf = first(cfRaw);
  const mc = first(mcRaw);

  const currentAssets = pick(bs.totalCurrentAssets);
  const currentLiabilities = pick(bs.totalCurrentLiabilities);
  const workingCapital =
    currentAssets !== null && currentLiabilities !== null ? currentAssets - currentLiabilities : null;

  return {
    marketCap: pick(mc.marketCap),
    totalAssets: pick(bs.totalAssets),
    totalLiabilities: pick(bs.totalLiabilities),
    workingCapital,
    retainedEarnings: pick(bs.retainedEarnings),
    ebit: pick(is.operatingIncome, is.ebit),
    revenue: pick(is.revenue),
    freeCashFlow: pick(cf.freeCashFlow),
    netIncomeHistory: isRows.map((r) => num(r.netIncome)).filter((v): v is number => v !== null),
    revenueHistory: isRows.map((r) => num(r.revenue)).filter((v): v is number => v !== null),
  };
}

export interface ScreenedTicker {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number | null;
}

/** stable company-screener → 시총 밴드 내 활발히 거래되는 종목 목록(전략2 마이크로캡 유니버스). */
export async function screenMarketCap(
  minCap: number,
  maxCap: number,
  limit = 30,
): Promise<ScreenedTicker[]> {
  const data = await fmpGet(
    'company-screener',
    {
      marketCapMoreThan: String(minCap),
      marketCapLowerThan: String(maxCap),
      isActivelyTrading: 'true',
      exchange: 'NASDAQ,NYSE',
      limit: String(limit),
    },
    24,
  );
  if (!Array.isArray(data)) return [];
  return (data as Array<Record<string, unknown>>).map((x) => ({
    symbol: String(x.symbol ?? ''),
    name: typeof x.companyName === 'string' ? x.companyName : String(x.symbol ?? ''),
    sector: typeof x.sector === 'string' ? x.sector : '—',
    marketCap: pick(x.marketCap),
  })).filter((t) => t.symbol);
}

/** stable historical-price-eod/full → OHLCV (오래된→최신 순). 데이터 없으면 null. */
export async function priceHistory(ticker: string): Promise<Ohlcv | null> {
  const data = await fmpGet('historical-price-eod/full', { symbol: ticker }, 24);
  if (!Array.isArray(data) || data.length === 0) return null;
  const rows = [...data].reverse(); // FMP 는 최신→과거 순 → 뒤집어 시간순 정렬
  const high: number[] = [];
  const low: number[] = [];
  const close: number[] = [];
  const volume: number[] = [];
  for (const x of rows as Array<Record<string, unknown>>) {
    const c = x.close;
    if (typeof c !== 'number') continue;
    high.push(typeof x.high === 'number' ? x.high : c);
    low.push(typeof x.low === 'number' ? x.low : c);
    close.push(c);
    volume.push(typeof x.volume === 'number' ? x.volume : 0);
  }
  return close.length ? { high, low, close, volume } : null;
}
