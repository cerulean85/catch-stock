/**
 * 가격 히스토리(OHLCV) → 기술적 지표 원시 계산. 순수 함수, API 불필요.
 *
 * inv-stds `data/indicators.py`(pandas) 의 배열 기반 이식.
 * RSI 는 catch-stock 공용 Wilder 구현(@/shared/lib/rsi)을 재사용한다.
 */
import { rsi14 } from '@/shared/lib/rsi';

export interface Ohlcv {
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export interface Indicators {
  price: number | null;
  ma20: number | null;
  ma60: number | null;
  ma120: number | null;
  rsi: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  atr: number | null;
  volTrend: number | null;
  week52High: number | null;
  week52Low: number | null;
}

/** 최근 window 개 종가 단순이동평균. 데이터 부족 시 null. */
export function sma(close: number[], window: number): number | null {
  if (close.length < window) return null;
  const tail = close.slice(close.length - window);
  return tail.reduce((a, b) => a + b, 0) / window;
}

/** span 기반 EMA 시계열 (adjust=false, 판다스 ewm(span).mean() 동일). */
function emaSeries(values: number[], span: number): number[] {
  const alpha = 2 / (span + 1);
  const out = new Array<number>(values.length);
  let prev = values[0];
  out[0] = prev;
  for (let i = 1; i < values.length; i++) {
    prev = alpha * values[i] + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

/** MACD(12,26,9) 최신값 [macdLine, signal, hist]. 데이터 부족 시 모두 null. */
export function macd(
  close: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): [number | null, number | null, number | null] {
  if (close.length < slow + signal) return [null, null, null];
  const emaFast = emaSeries(close, fast);
  const emaSlow = emaSeries(close, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = emaSeries(macdLine, signal);
  const last = close.length - 1;
  const line = macdLine[last];
  const sig = signalLine[last];
  return [line, sig, line - sig];
}

/** ATR(14) — 최근 period 개 True Range 평균. df 컬럼 High/Low/Close. */
export function atr(bars: Ohlcv, period = 14): number | null {
  const { high, low, close } = bars;
  if (close.length < period + 1) return null;
  const tr: number[] = [];
  for (let i = 1; i < close.length; i++) {
    const prevClose = close[i - 1];
    tr.push(
      Math.max(
        high[i] - low[i],
        Math.abs(high[i] - prevClose),
        Math.abs(low[i] - prevClose),
      ),
    );
  }
  const tail = tr.slice(tr.length - period);
  return tail.reduce((a, b) => a + b, 0) / period;
}

/** 상승일 거래량 vs 하락일 거래량 비율 (>1 이면 매집 우위). */
export function volumeTrend(bars: Ohlcv, window = 20): number | null {
  const { close, volume } = bars;
  if (close.length < window + 1) return null;
  const start = close.length - window;
  let upVol = 0;
  let downVol = 0;
  for (let i = start; i < close.length; i++) {
    const chg = close[i] - close[i - 1];
    if (chg > 0) upVol += volume[i];
    else if (chg < 0) downVol += volume[i];
  }
  if (downVol <= 0) return upVol > 0 ? 2.0 : 1.0;
  return upVol / downVol;
}

/** OHLCV → 원시 기술 지표. */
export function computeAll(bars: Ohlcv): Indicators {
  const close = bars.close.filter((v) => Number.isFinite(v));
  const price = close.length ? close[close.length - 1] : null;
  const [macdLine, macdSignal, macdHist] = macd(close);
  const has52 = bars.high.length >= 20;
  return {
    price,
    ma20: sma(close, 20),
    ma60: sma(close, 60),
    ma120: sma(close, 120),
    rsi: rsi14(close),
    macdLine,
    macdSignal,
    macdHist,
    atr: atr(bars, 14),
    volTrend: volumeTrend(bars, 20),
    week52High: has52 ? Math.max(...bars.high.slice(Math.max(0, bars.high.length - 252))) : null,
    week52Low: has52 ? Math.min(...bars.low.slice(Math.max(0, bars.low.length - 252))) : null,
  };
}
