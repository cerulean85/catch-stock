import 'server-only';
import pLimit from 'p-limit';
import { fetchOhlcv } from '@/shared/lib/yahoo';
import * as fmp from '@/shared/lib/fmp';
import * as cache from '@/shared/lib/cache';
import { getUniverse, type UniverseName } from '@/features/scoring/model/universe';
import type { Ohlcv } from '@/features/scoring/model/indicators';
import { detectForcedLiquidation, type DetectOptions } from '../model/detect';
import { altmanZ } from '../model/altman';
import { detectMicrocapAlpha, type MicrocapOptions } from '../model/microcap';
import type {
  SignalItem,
  SignalScanResponse,
  MicrocapItem,
  MicrocapScanResponse,
} from '../model/types';

/**
 * 수급왜곡 신호 스캔 서버 레이어 (concept2.md Phase 4).
 * 전략1(강제청산) + 전략2(마이크로캡) 중 무료·이식 데이터로 판정 가능한 범위.
 * yahoo/FMP 레이트리밋을 고려해 동시성을 낮게 잡고 OHLCV·재무를 캐싱한다.
 */

const CONCURRENCY = 4;
const OHLCV_TTL_HOURS = 12;

async function loadOhlcv(symbol: string): Promise<Ohlcv | null> {
  const key = `ohlcv1y:${symbol}`;
  const cached = cache.get<Ohlcv>(key, OHLCV_TTL_HOURS);
  if (cached) return cached;
  if (cache.missRecently(key)) return null;
  const bars = await fetchOhlcv(symbol, 2);
  if (bars) cache.set(key, bars);
  else cache.markMiss(key);
  return bars;
}

/** 최근 window 봉 평균 일일 거래대금(종가×거래량, USD). */
function avgDollarVolume(bars: Ohlcv, window = 20): number | null {
  const { close, volume } = bars;
  const n = Math.min(window, close.length, volume.length);
  if (n === 0) return null;
  let sum = 0;
  for (let i = close.length - n; i < close.length; i++) sum += close[i] * (volume[i] ?? 0);
  return sum / n;
}

// ── 전략 1: 강제청산 차익 ────────────────────────────────────────────────
const FORCED_OMITTED = [
  '조건 B: Short Volume Ratio·Dark Pool 대량매도 (유료 데이터 미이식)',
  '조건 C 일부: EPS 가이던스 충족 (컨센서스 데이터 미이식) — Altman Z-Score는 판정',
];

/** triggered 후보에 한해 재무제표로 Altman Z-Score(조건 C 신용위험)를 계산해 부착. */
async function attachAltman(item: {
  symbol: string;
  name: string;
  sector: string;
  signal: SignalItem['signal'];
}): Promise<SignalItem> {
  const st = await fmp.statements(item.symbol);
  const altman = altmanZ({
    workingCapital: st.workingCapital,
    retainedEarnings: st.retainedEarnings,
    ebit: st.ebit,
    marketCap: st.marketCap,
    totalAssets: st.totalAssets,
    totalLiabilities: st.totalLiabilities,
    revenue: st.revenue,
  });
  return { ...item, altman };
}

export async function scanForcedLiquidation(
  opts: { universe?: UniverseName; params?: DetectOptions } = {},
): Promise<SignalScanResponse> {
  const tickers = getUniverse(opts.universe ?? 'default');
  const limit = pLimit(CONCURRENCY);

  const raw = await Promise.all(
    tickers.map((t) =>
      limit(async () => {
        const bars = await loadOhlcv(t.symbol);
        if (!bars) return null;
        const signal = detectForcedLiquidation(bars, opts.params);
        if (!signal || !signal.triggered) return null;
        return { symbol: t.symbol, name: t.name, sector: t.sector, signal };
      }),
    ),
  );
  const triggered = raw.filter((x): x is NonNullable<typeof x> => x !== null);

  // Altman-Z 는 급락 후보에만 계산(FMP 콜 절약).
  const candidates = (await Promise.all(triggered.map((t) => limit(() => attachAltman(t))))).sort(
    (a, b) => a.signal.dropPct - b.signal.dropPct,
  );

  return {
    strategy: 'forced_liquidation',
    label: '전략1 강제청산 차익 (급락·과매도·거래량폭증 + Altman-Z 신용검증)',
    asOf: new Date().toISOString().slice(0, 10),
    params: {
      dropThresholdPct: opts.params?.dropThresholdPct ?? -20,
      rsiThreshold: opts.params?.rsiThreshold ?? 25,
      volumeMultiple: opts.params?.volumeMultiple ?? 4,
      dropWindow: opts.params?.dropWindow ?? 5,
      volumeWindow: opts.params?.volumeWindow ?? 20,
    },
    omitted: FORCED_OMITTED,
    scanned: tickers.length,
    candidates,
  };
}

// ── 전략 2: 마이크로캡 소외주 ────────────────────────────────────────────
const MICROCAP_OMITTED = [
  '조건 B: 13F 기관지분율 <15% · 애널리스트 커버리지 ≤2 (13F/컨센서스 데이터 미이식)',
];

export async function scanMicrocapAlpha(
  opts: { params?: MicrocapOptions; limit?: number } = {},
): Promise<MicrocapScanResponse> {
  const p = opts.params ?? {};
  const minCap = p.minCap ?? 100_000_000;
  const maxCap = p.maxCap ?? 500_000_000;
  const profitYears = p.profitYears ?? 3;
  const cagrMin = p.revenueCagrMin ?? 0.12;
  const dvMax = p.dollarVolumeMax ?? 500_000;
  const scanLimit = opts.limit ?? 12;

  const base = {
    strategy: 'microcap_alpha' as const,
    label: '전략2 마이크로캡 소외주 (시총밴드·3년흑자·FCF+·매출CAGR·저유동성)',
    asOf: new Date().toISOString().slice(0, 10),
    params: {
      minCap,
      maxCap,
      profitYears,
      revenueCagrMin: cagrMin,
      dollarVolumeMax: dvMax,
      limit: scanLimit,
    },
    omitted: MICROCAP_OMITTED,
  };

  if (!fmp.hasKey()) {
    return { ...base, scanned: 0, candidates: [], note: 'FMP_API_KEY 미설정 — 마이크로캡 유니버스 조회 불가.' };
  }

  // 시총 밴드로 마이크로캡 유니버스를 FMP 스크리너에서 동적으로 확보.
  const universe = await fmp.screenMarketCap(minCap, maxCap, scanLimit);
  if (universe.length === 0) {
    // screener 가 빈 배열 → 무료 티어 일일 한도 소진 또는 밴드 내 종목 없음(구분 불가).
    return { ...base, scanned: 0, candidates: [], note: 'FMP 스크리너 결과 0건 — 무료 티어 일일 한도 소진 또는 밴드 내 종목 없음.' };
  }
  const limit = pLimit(CONCURRENCY);

  const raw = await Promise.all(
    universe.map((t) =>
      limit(async (): Promise<MicrocapItem | null> => {
        const [st, bars] = await Promise.all([fmp.statements(t.symbol, profitYears + 1), loadOhlcv(t.symbol)]);
        const signal = detectMicrocapAlpha(
          {
            marketCap: t.marketCap ?? st.marketCap,
            netIncomeHistory: st.netIncomeHistory,
            revenueHistory: st.revenueHistory,
            freeCashFlow: st.freeCashFlow,
            avgDollarVolume: bars ? avgDollarVolume(bars) : null,
          },
          { minCap, maxCap, profitYears, revenueCagrMin: cagrMin, dollarVolumeMax: dvMax },
        );
        if (!signal.triggered) return null;
        return { symbol: t.symbol, name: t.name, sector: t.sector, signal };
      }),
    ),
  );

  const candidates = raw
    .filter((x): x is MicrocapItem => x !== null)
    .sort((a, b) => (b.signal.revenueCagrPct ?? 0) - (a.signal.revenueCagrPct ?? 0));

  return { ...base, scanned: universe.length, candidates };
}
