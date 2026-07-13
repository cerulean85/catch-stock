import YahooFinance from 'yahoo-finance2';
import type { Ohlcv } from '@/features/scoring/model/indicators';

export interface PriceBars {
  closes: number[];
  lastClose: number;
  asOf: Date;
}

const client = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const DAY_MS = 24 * 60 * 60 * 1000;

function dateAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

async function fetchCloses(
  symbol: string,
  interval: '1d' | '1mo',
  period1: Date,
): Promise<PriceBars | null> {
  const result = await client.chart(symbol, { period1, interval });
  const quotes = result.quotes ?? [];
  const closes: number[] = [];
  let lastClose: number | null = null;
  let asOf: Date | null = null;
  for (const q of quotes) {
    if (q.close == null) continue;
    closes.push(q.close);
    lastClose = q.close;
    asOf = q.date;
  }
  if (lastClose == null || asOf == null) return null;
  return { closes, lastClose, asOf };
}

export async function fetchDailyBars(symbol: string): Promise<PriceBars | null> {
  return fetchCloses(symbol, '1d', dateAgo(120));
}

export async function fetchMonthlyBars(symbol: string): Promise<PriceBars | null> {
  return fetchCloses(symbol, '1mo', dateAgo(36 * 31));
}

// ---------------------------------------------------------------------------
// 스코어링(inv-stds 통합)용 확장 — OHLCV·펀더멘털·밸류밴드. yf.py 폴백 이식.
// ---------------------------------------------------------------------------

/** 일봉 OHLCV. FMP 결측 시 기술지표·밸류밴드 계산에 사용. 기본 2년. */
export async function fetchOhlcv(symbol: string, years = 2): Promise<Ohlcv | null> {
  const result = await client.chart(symbol, {
    period1: dateAgo(Math.round(years * 366)),
    interval: '1d',
  });
  const quotes = result.quotes ?? [];
  const high: number[] = [];
  const low: number[] = [];
  const close: number[] = [];
  const volume: number[] = [];
  for (const q of quotes) {
    if (q.close == null) continue;
    close.push(q.close);
    high.push(q.high ?? q.close);
    low.push(q.low ?? q.close);
    volume.push(q.volume ?? 0);
  }
  return close.length ? { high, low, close, volume } : null;
}

export interface YahooFundamentals {
  per: number | null;
  pbr: number | null;
  roe: number | null;
  ev_ebitda: number | null;
  dividend_yield: number | null;
  debt_to_equity: number | null;
  retention: number | null;
  growth_rate: number | null;
  operating_margin: number | null;
  target_price: number | null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** yahoo quoteSummary → 기준 key 매핑 (FMP 결측 폴백). */
export async function fetchFundamentals(symbol: string): Promise<YahooFundamentals> {
  let summary: {
    summaryDetail?: Record<string, unknown>;
    defaultKeyStatistics?: Record<string, unknown>;
    financialData?: Record<string, unknown>;
  } = {};
  try {
    summary = await client.quoteSummary(symbol, {
      modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'],
    });
  } catch {
    return {
      per: null,
      pbr: null,
      roe: null,
      ev_ebitda: null,
      dividend_yield: null,
      debt_to_equity: null,
      retention: null,
      growth_rate: null,
      operating_margin: null,
      target_price: null,
    };
  }
  const sd = summary.summaryDetail ?? {};
  const ks = summary.defaultKeyStatistics ?? {};
  const fd = summary.financialData ?? {};

  const payout = num(sd.payoutRatio);
  const de = num(fd.debtToEquity);

  return {
    per: num(sd.trailingPE) ?? num(sd.forwardPE),
    pbr: num(ks.priceToBook),
    roe: num(fd.returnOnEquity),
    ev_ebitda: num(ks.enterpriseToEbitda),
    dividend_yield: num(sd.dividendYield),
    debt_to_equity: de !== null ? de / 100 : null, // yahoo 는 % 로 줌 (예: 50.0)
    retention: payout !== null ? 1 - payout : null,
    growth_rate: num(fd.revenueGrowth),
    operating_margin: num(fd.operatingMargins),
    target_price: num(fd.targetMeanPrice),
  };
}

/**
 * 현재가의 과거 5년 가격 분포 백분위 — 밸류에이션 밴드 v1 프록시.
 * EPS 고정 가정. bars 를 주면 재요청하지 않음.
 */
export async function valuationPercentile(
  symbol: string,
  bars?: Ohlcv | null,
): Promise<number | null> {
  const data = bars ?? (await fetchOhlcv(symbol, 5));
  if (!data || data.close.length < 60) return null;
  const closes = data.close;
  const current = closes[closes.length - 1];
  const below = closes.filter((c) => c < current).length;
  return Math.round((below / closes.length) * 1000) / 10;
}
