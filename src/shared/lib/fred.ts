import 'server-only';
import * as cache from './cache';

/**
 * FRED(세인트루이스 연준) 매크로 클라이언트 — #17 금리·환율 시장 레짐용.
 *
 * 전 종목 공통 컨텍스트(개별 차별화 아님)이므로, 시장 전체의 금리·환율 레짐을
 * 0~5 서브스코어 + 사람이 읽을 배너로 환산한다. 키 없으면 null → 엔진이 중립 3.
 * inv-stds `data/fred.py` 이식.
 */

const BASE_URL = 'https://api.stlouisfed.org/fred';
const TIMEOUT_MS = 15_000;
const LOOKBACK = 63; // 3개월(거래일 ≈ 63일) 전과 비교해 추세 판단

const SERIES = {
  dgs10: 'DGS10', // 10년 국채 수익률
  dgs2: 'DGS2', // 2년 국채 수익률
  fedfunds: 'DFF', // 연방기금 실효금리
  dollar: 'DTWEXBGS', // 광의 달러 지수(환율 대용)
} as const;

type Obs = [string, number]; // (date, value), 최신→과거 순

function apiKey(): string {
  return process.env.FRED_API_KEY ?? '';
}

export function hasKey(): boolean {
  return Boolean(apiKey());
}

async function observations(seriesId: string): Promise<Obs[]> {
  if (!hasKey()) return [];
  const cacheKey = `fred:obs:${seriesId}`;
  const cached = cache.get<Obs[]>(cacheKey, 12);
  if (cached !== null) return cached;

  const url = new URL(`${BASE_URL}/series/observations`);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey());
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', '130');

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { observations?: Array<{ date?: string; value?: string }> };
    const out: Obs[] = [];
    for (const o of data.observations ?? []) {
      const val = o.value;
      if (val === undefined || val === '' || val === '.') continue;
      const num = Number(val);
      if (Number.isFinite(num)) out.push([o.date ?? '', num]);
    }
    if (out.length) cache.set(cacheKey, out);
    return out;
  } catch {
    return [];
  }
}

function latest(obs: Obs[]): number | null {
  return obs.length ? obs[0][1] : null;
}

/** 최신값 − 약 3개월 전 값 (양수=상승). */
function change(obs: Obs[]): number | null {
  if (obs.length <= LOOKBACK) return null;
  return obs[0][1] - obs[LOOKBACK][1];
}

function pctChange(obs: Obs[]): number | null {
  if (obs.length <= LOOKBACK || obs[LOOKBACK][1] === 0) return null;
  return round1((obs[0][1] / obs[LOOKBACK][1] - 1) * 100);
}

export interface MacroSnapshot {
  subscore: number;
  regime: string;
  treasury10y: number;
  treasury2y: number | null;
  curveSpread: number | null;
  fedFunds: number | null;
  rateChange3m: number | null;
  dollarChange3mPct: number | null;
  drivers: string[];
  asOf: string | null;
}

// 인메모리 메모 — 스크리닝 루프에서 종목마다 재계산 방지 (요청 단위 캐시는 cache.ts 가 담당)
type GlobalWithMemo = typeof globalThis & { __fredMemo?: MacroSnapshot | null };

/** 시장 금리·환율 레짐 스냅샷. 키 없거나 데이터 없으면 null. */
export async function snapshot(force = false): Promise<MacroSnapshot | null> {
  const g = globalThis as GlobalWithMemo;
  if (g.__fredMemo !== undefined && g.__fredMemo !== null && !force) return g.__fredMemo;
  if (!hasKey()) return null;

  const [dgs10, dgs2, dff, dollar] = await Promise.all([
    observations(SERIES.dgs10),
    observations(SERIES.dgs2),
    observations(SERIES.fedfunds),
    observations(SERIES.dollar),
  ]);

  const y10 = latest(dgs10);
  const y2 = latest(dgs2);
  const ff = latest(dff);
  const dxyChg = change(dollar);
  if (y10 === null) return null;

  const spread = y10 !== null && y2 !== null ? y10 - y2 : null;
  const rateChg = change(dgs10);

  const { subscore, drivers } = ratesFxScore(y10, spread, rateChg, dxyChg);
  const snap: MacroSnapshot = {
    subscore,
    regime: regimeLabel(subscore),
    treasury10y: y10,
    treasury2y: y2,
    curveSpread: spread !== null ? round2(spread) : null,
    fedFunds: ff,
    rateChange3m: rateChg !== null ? round2(rateChg) : null,
    dollarChange3mPct: pctChange(dollar),
    drivers,
    asOf: dgs10.length ? dgs10[0][0] : null,
  };
  g.__fredMemo = snap;
  return snap;
}

/** 주식에 대한 금리·환율 레짐 우호도 0~5. 중립 3에서 가감. */
function ratesFxScore(
  y10: number | null,
  spread: number | null,
  rateChg: number | null,
  dxyChg: number | null,
): { subscore: number; drivers: string[] } {
  let score = 3.0;
  const drivers: string[] = [];

  // 1) 금리 추세 (하락=우호, 상승=역풍) — 가장 큰 요인
  if (rateChg !== null) {
    if (rateChg <= -0.5) {
      score += 1.0;
      drivers.push('10Y 큰 폭 하락(우호)');
    } else if (rateChg <= -0.1) {
      score += 0.5;
      drivers.push('10Y 하락(우호)');
    } else if (rateChg >= 0.5) {
      score -= 1.0;
      drivers.push('10Y 큰 폭 상승(역풍)');
    } else if (rateChg >= 0.1) {
      score -= 0.5;
      drivers.push('10Y 상승(역풍)');
    }
  }

  // 2) 수익률 곡선 (역전=침체 신호)
  if (spread !== null) {
    if (spread < 0) {
      score -= 1.0;
      drivers.push('수익률 곡선 역전(경기 경계)');
    } else if (spread >= 0.5) {
      score += 0.5;
      drivers.push('곡선 정상화(우호)');
    }
  }

  // 3) 절대 금리 수준 (높으면 할인율 부담)
  if (y10 !== null) {
    if (y10 >= 5.0) {
      score -= 0.5;
      drivers.push('고금리(할인율 부담)');
    } else if (y10 < 3.5) {
      score += 0.5;
      drivers.push('저금리(밸류 우호)');
    }
  }

  // 4) 달러 강세 (다국적 기업 실적 역풍)
  if (dxyChg !== null && dxyChg >= 3.0) {
    score -= 0.5;
    drivers.push('달러 강세(수출·다국적 역풍)');
  }

  return { subscore: Math.max(0, Math.min(5, round1(score))), drivers };
}

function regimeLabel(subscore: number): string {
  if (subscore >= 4.0) return '우호적';
  if (subscore >= 3.0) return '중립';
  if (subscore >= 2.0) return '주의';
  return '부정적';
}

/** #17 서브스코어(0~5). 데이터 없으면 null → 엔진이 중립 3. */
export async function ratesFxSubscore(): Promise<number | null> {
  const snap = await snapshot();
  return snap ? snap.subscore : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
