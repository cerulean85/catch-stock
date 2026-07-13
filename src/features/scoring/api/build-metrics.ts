import 'server-only';
import * as fmp from '@/shared/lib/fmp';
import * as fred from '@/shared/lib/fred';
import { fetchOhlcv, fetchFundamentals, valuationPercentile } from '@/shared/lib/yahoo';
import { computeAll, type Ohlcv } from '../model/indicators';
import type { Metrics } from '../model/filters';
import {
  maSubscore,
  volumeSubscore,
  rsiMacdSubscore,
  riskRewardSubscore,
  valuationBandSubscore,
  institutionalSubscore,
} from '../model/technical';

/**
 * 데이터 프로바이더 — FMP + yahoo 를 종합해 엔진용 metrics 생성.
 * inv-stds `data/provider.py` 이식.
 *
 * metrics 구성:
 *   · 밴드 기준(per..operating_margin): 원시 지표 값 (FMP 우선, 결측 시 yahoo 폴백)
 *   · custom 기준(기술/밸류밴드/손익비): 0~5 서브스코어로 미리 변환
 *   · 수동 기준(moat/tam/governance/geopolitical): overlay 로 주입(없으면 엔진 중립 3)
 *   · 필터용 보조값: price, ma120, valuation_percentile, dividend_yield 등
 */

export interface Overlay {
  moat?: number;
  tam?: number;
  governance?: number;
  geopolitical?: number;
  rates_fx?: number;
  institutional_change?: number;
}

const FUND_KEYS = [
  'per',
  'pbr',
  'roe',
  'ev_ebitda',
  'dividend_yield',
  'debt_to_equity',
  'retention',
  'growth_rate',
  'operating_margin',
] as const;

type FundKey = (typeof FUND_KEYS)[number];

/** FMP 우선 + yahoo 폴백. yahoo 는 FMP 결측이 있을 때만 호출(429·중복 방지). */
async function mergeFundamentals(
  ticker: string,
): Promise<{ fund: Record<FundKey, number | null>; target: number | null }> {
  const fmpF = fmp.hasKey() ? await fmp.fundamentals(ticker) : null;
  const merged = {} as Record<FundKey, number | null>;
  for (const k of FUND_KEYS) merged[k] = fmpF ? fmpF[k] : null;
  let target = fmp.hasKey() ? await fmp.priceTarget(ticker) : null;

  const needsFallback = FUND_KEYS.some((k) => merged[k] === null) || target === null;
  if (needsFallback) {
    const yf = await fetchFundamentals(ticker);
    for (const k of FUND_KEYS) {
      if (merged[k] === null) merged[k] = yf[k];
    }
    if (target === null) target = yf.target_price;
  }
  return { fund: merged, target };
}

/** 단일 종목의 엔진 입력 metrics 생성. */
export async function buildMetrics(ticker: string, overlay: Overlay = {}): Promise<Metrics> {
  const metrics: Metrics = {};

  // 1) 기본적 지표
  const { fund, target } = await mergeFundamentals(ticker);
  Object.assign(metrics, fund);

  // 2) 가격 히스토리 → 기술 지표 (FMP 우선, yahoo 폴백)
  let bars: Ohlcv | null = fmp.hasKey() ? await fmp.priceHistory(ticker) : null;
  if (!bars || bars.close.length === 0) {
    bars = await fetchOhlcv(ticker, 2);
  }
  if (bars && bars.close.length > 0) {
    const ind = computeAll(bars);
    metrics.price = ind.price;
    metrics.ma120 = ind.ma120;
    metrics.moving_average = maSubscore(ind.price, ind.ma20, ind.ma60, ind.ma120);
    metrics.volume = volumeSubscore(ind.volTrend);
    metrics.rsi_macd = rsiMacdSubscore(ind.rsi, ind.macdLine, ind.macdSignal);
    metrics.risk_reward = riskRewardSubscore(ind.price, target, ind.atr, ind.week52Low);
    // 밸류에이션 밴드 — 기술지표에 쓴 히스토리로 백분위 계산(재요청 없음)
    const pct = await valuationPercentile(ticker, bars);
    metrics.valuation_percentile = pct;
    metrics.valuation_band = valuationBandSubscore(pct);
  }

  // 3) 기관 수급 (프록시) — 무료 데이터 제한, 결측이면 제외됨
  if (overlay.institutional_change != null) {
    metrics.institutional = institutionalSubscore(overlay.institutional_change);
  }

  // 4) 수동 기준 오버레이 (0~5 직접). 없으면 엔진이 중립 3 적용.
  for (const k of ['moat', 'tam', 'governance', 'geopolitical', 'rates_fx'] as const) {
    if (overlay[k] != null) metrics[k] = Number(overlay[k]);
  }

  // 5) #17 금리·환율 — 오버레이 미지정 시 FRED 시장 레짐으로 자동 채움(전 종목 공통)
  if (metrics.rates_fx == null) {
    const rf = await fred.ratesFxSubscore();
    if (rf !== null) metrics.rates_fx = rf;
  }

  return metrics;
}
