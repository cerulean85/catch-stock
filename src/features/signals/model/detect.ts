import { rsi14 } from '@/shared/lib/rsi';
import type { Ohlcv } from '@/features/scoring/model/indicators';

/**
 * 전략 1 (강제청산 차익) 조건 A 탐지 — concept2.md.
 *
 * "펀더멘털과 무관하게 폭락한 우량주"를 가격/거래량만으로 1차 선별한다:
 *   - 최근 N거래일 누적 -20% 이상 급락
 *   - RSI(14) ≤ 25 극단적 과매도
 *   - 최근 거래량이 직전 20일 평균의 4배 이상 폭증
 *
 * 조건 B(Short Volume/Dark Pool)·C(Altman-Z·EPS 가이던스)는 유료/추가데이터 의존이라
 * 여기서 판정하지 않는다(server 응답의 `omitted`에 명시).
 */

export interface DetectOptions {
  dropThresholdPct?: number; // 기본 -20 (누적 수익률 %)
  rsiThreshold?: number; // 기본 25
  volumeMultiple?: number; // 기본 4
  dropWindow?: number; // 기본 5 거래일
  volumeWindow?: number; // 기본 20 거래일
}

export interface ForcedLiquidationSignal {
  dropPct: number; // dropWindow 누적 수익률 %
  dropDays: number;
  rsi: number | null; // RSI(14)
  volumeRatio: number | null; // 최근 거래량 / 20일 평균
  conditions: { drop: boolean; oversold: boolean; volumeSpike: boolean };
  triggered: boolean; // 세 조건 모두 충족
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function detectForcedLiquidation(
  bars: Ohlcv,
  opts: DetectOptions = {},
): ForcedLiquidationSignal | null {
  const dropThreshold = opts.dropThresholdPct ?? -20;
  const rsiThreshold = opts.rsiThreshold ?? 25;
  const volumeMultiple = opts.volumeMultiple ?? 4;
  const dropWindow = opts.dropWindow ?? 5;
  const volumeWindow = opts.volumeWindow ?? 20;

  const { close, volume } = bars;
  // RSI(14)에 최소 15봉, 거래량비에 volumeWindow+1봉, 급락에 dropWindow+1봉 필요.
  const minBars = Math.max(dropWindow + 1, volumeWindow + 1, 15);
  if (close.length < minBars || volume.length < volumeWindow + 1) return null;

  const last = close[close.length - 1];
  const prior = close[close.length - 1 - dropWindow];
  const dropPct = prior > 0 ? round2((last / prior - 1) * 100) : 0;

  const rsi = rsi14(close);

  const recentVol = volume[volume.length - 1];
  const windowVols = volume.slice(-1 - volumeWindow, -1); // 오늘 제외 직전 20일
  const avgVol = windowVols.reduce((a, b) => a + b, 0) / windowVols.length;
  const volumeRatio = avgVol > 0 ? round2(recentVol / avgVol) : null;

  const drop = dropPct <= dropThreshold;
  const oversold = rsi !== null && rsi <= rsiThreshold;
  const volumeSpike = volumeRatio !== null && volumeRatio >= volumeMultiple;

  return {
    dropPct,
    dropDays: dropWindow,
    rsi,
    volumeRatio,
    conditions: { drop, oversold, volumeSpike },
    triggered: drop && oversold && volumeSpike,
  };
}
