/**
 * custom 기준(기술·수급·밸류밴드·손익비)의 원시 지표 → 0~5 서브스코어 변환.
 *
 * 엔진은 이 값들을 metrics[key] 로 그대로 받아 사용한다.
 */

/** 이동평균선 정배열 정도. 정배열(P>20>60>120)=5. */
export function maSubscore(
  price: number | null,
  ma20: number | null,
  ma60: number | null,
  ma120: number | null,
): number | null {
  if (price === null || ma20 === null || ma60 === null || ma120 === null) return null;
  // 현재가가 각 MA 위에 있는지 (0~3점)
  const above = Number(price > ma20) + Number(price > ma60) + Number(price > ma120);
  // 정배열 정렬 보너스 (0~2점)
  let align = 0;
  if (ma20 > ma60) align += 1;
  if (ma60 > ma120) align += 1;
  return Math.min(5, above + align);
}

/** 상승일/하락일 거래량 비율 → 점수. >1.5 강한 매집. */
export function volumeSubscore(volTrend: number | null): number | null {
  if (volTrend === null) return null;
  if (volTrend >= 1.8) return 5.0;
  if (volTrend >= 1.4) return 4.0;
  if (volTrend >= 1.1) return 3.0;
  if (volTrend >= 0.9) return 2.0;
  if (volTrend >= 0.6) return 1.0;
  return 0.0;
}

/** RSI 건전 구간 + MACD 골든크로스 결합 (각 0~2.5). */
export function rsiMacdSubscore(
  rsi: number | null,
  macdLine: number | null,
  macdSignal: number | null,
): number | null {
  if (rsi === null && macdLine === null) return null;
  let score = 0.0;
  // RSI: 40~60 건전, 30~40/60~70 보통, 과매수/과매도 감점 (단 과매도는 진입기회로 소폭 가점)
  if (rsi !== null) {
    if (rsi >= 45 && rsi <= 60) score += 2.5;
    else if ((rsi >= 40 && rsi < 45) || (rsi > 60 && rsi <= 68)) score += 1.8;
    else if (rsi >= 30 && rsi < 40) score += 1.2; // 눌림목
    else if (rsi < 30) score += 1.5; // 과매도 반등 기대
    else score += 0.5; // >68 과매수
  }
  // MACD: 시그널 상회(골든) 가점
  if (macdLine !== null && macdSignal !== null) {
    if (macdLine > macdSignal) score += macdLine > 0 ? 2.5 : 1.8;
    else score += 0.5;
  }
  return round2(Math.min(5.0, score));
}

/** 자기 PER/PBR 5년 백분위 → 점수. 저평가(낮은 백분위)일수록 고득점. */
export function valuationBandSubscore(percentile: number | null): number | null {
  if (percentile === null) return null;
  if (percentile <= 20) return 5.0;
  if (percentile <= 40) return 4.0;
  if (percentile <= 60) return 3.0;
  if (percentile <= 80) return 2.0;
  if (percentile <= 90) return 1.0;
  return 0.0;
}

/** 손익비 = (목표가-현재가)/(현재가-손절). 손절=P-2·ATR (없으면 52주 저점). */
export function riskRewardSubscore(
  price: number | null,
  target: number | null,
  atr: number | null,
  week52Low: number | null,
): number | null {
  if (price === null || price <= 0) return null;
  let stop: number | null = null;
  if (atr !== null) stop = price - 2 * atr;
  else if (week52Low !== null) stop = week52Low;
  if (stop === null || stop >= price) return null;
  if (target === null || target <= price) return 1.0; // 상승여력 불명확/음수
  const ratio = (target - price) / (price - stop);
  if (ratio >= 3) return 5.0;
  if (ratio >= 2) return 4.0;
  if (ratio >= 1.5) return 3.0;
  if (ratio >= 1) return 2.0;
  return 0.0;
}

/** 기관 지분율 분기 변화(%p) → 점수. 증가=매집 우위. 결측이면 null(프록시라 제외). */
export function institutionalSubscore(pctChange: number | null): number | null {
  if (pctChange === null) return null;
  if (pctChange >= 2) return 5.0;
  if (pctChange >= 0.5) return 4.0;
  if (pctChange >= -0.5) return 3.0;
  if (pctChange >= -2) return 2.0;
  return 1.0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
