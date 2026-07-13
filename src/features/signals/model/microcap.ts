/**
 * 전략 2 (마이크로캡 소외주) 판정 — concept2.md.
 *
 * 판정하는 조건:
 *   A. 시가총액 밴드: $100M ~ $500M
 *   C. 실적 건전성: N개년 연속 순이익 흑자 · FCF 양수 · 매출 CAGR ≥ 12%
 *   D. 유동성 바닥: 최근 20일 평균 일일 거래대금 < $500,000
 *
 * 조건 B(13F 기관지분율 <15% · 애널 커버리지 ≤2)는 유료/13F 데이터 의존이라 여기서 판정하지 않는다.
 */

export interface MicrocapInputs {
  marketCap: number | null;
  netIncomeHistory: number[]; // 최신→과거 (연간)
  revenueHistory: number[]; // 최신→과거 (연간)
  freeCashFlow: number | null;
  avgDollarVolume: number | null; // 20일 평균 일일 거래대금(USD)
}

export interface MicrocapOptions {
  minCap?: number; // 기본 100_000_000
  maxCap?: number; // 기본 500_000_000
  profitYears?: number; // 기본 3
  revenueCagrMin?: number; // 기본 0.12
  dollarVolumeMax?: number; // 기본 500_000
}

export interface MicrocapSignal {
  marketCap: number | null;
  revenueCagrPct: number | null; // %
  freeCashFlow: number | null;
  avgDollarVolume: number | null;
  conditions: {
    capBand: boolean;
    profitStreak: boolean;
    fcfPositive: boolean;
    revenueGrowth: boolean;
    lowLiquidity: boolean;
  };
  triggered: boolean;
}

/** 최신→과거 매출 시계열에서 spanYears 기간 연평균 성장률(소수, 예: 0.12). */
export function revenueCagr(history: number[], spanYears: number): number | null {
  if (spanYears < 1 || history.length < spanYears + 1) return null;
  const latest = history[0];
  const base = history[spanYears];
  if (base <= 0 || latest <= 0) return null;
  return Math.pow(latest / base, 1 / spanYears) - 1;
}

export function detectMicrocapAlpha(i: MicrocapInputs, opts: MicrocapOptions = {}): MicrocapSignal {
  const minCap = opts.minCap ?? 100_000_000;
  const maxCap = opts.maxCap ?? 500_000_000;
  const profitYears = opts.profitYears ?? 3;
  const cagrMin = opts.revenueCagrMin ?? 0.12;
  const dvMax = opts.dollarVolumeMax ?? 500_000;

  const capBand = i.marketCap !== null && i.marketCap >= minCap && i.marketCap <= maxCap;

  const recentNi = i.netIncomeHistory.slice(0, profitYears);
  const profitStreak = recentNi.length >= profitYears && recentNi.every((n) => n > 0);

  const fcfPositive = i.freeCashFlow !== null && i.freeCashFlow > 0;

  const cagr = revenueCagr(i.revenueHistory, profitYears - 1);
  const revenueGrowth = cagr !== null && cagr >= cagrMin;

  const lowLiquidity = i.avgDollarVolume !== null && i.avgDollarVolume < dvMax;

  return {
    marketCap: i.marketCap,
    revenueCagrPct: cagr === null ? null : Math.round(cagr * 1000) / 10,
    freeCashFlow: i.freeCashFlow,
    avgDollarVolume: i.avgDollarVolume,
    conditions: { capBand, profitStreak, fcfPositive, revenueGrowth, lowLiquidity },
    triggered: capBand && profitStreak && fcfPositive && revenueGrowth && lowLiquidity,
  };
}
