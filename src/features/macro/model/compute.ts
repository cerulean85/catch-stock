/**
 * 관측값을 화면에 올릴 수 있는 숫자로 바꾸는 계산. 전부 순수 함수다.
 * 입력 배열은 모두 **최신이 앞(index 0)** 인 내림차순으로 받는다.
 */
import type { MacroTransform } from './types';

/** 한 계열의 관측값 하나. */
export interface Observation {
  date: string;
  value: number;
}

/** 계열의 발표 주기별 1년치 관측 수. yoy 계산에 쓴다. */
const PERIODS_PER_YEAR: Record<string, number> = { D: 252, W: 52, M: 12, Q: 4 };

/** n기 전 대비 변화. 값이 모자라면 null. */
export function changeOver(values: number[], periods: number): number | null {
  const now = values[0];
  const then = values[periods];
  if (now == null || then == null) return null;
  return now - then;
}

/** 1년 전 대비 변화율(%). 기준값이 0이면 나눌 수 없으니 null. */
export function yearOverYear(values: number[], frequency: string): number | null {
  const periods = PERIODS_PER_YEAR[frequency];
  const now = values[0];
  const then = periods == null ? undefined : values[periods];
  if (now == null || then == null || then === 0) return null;
  return (now / then - 1) * 100;
}

/** 카탈로그의 transform대로 현재 값을 만든다. */
export function applyTransform(
  values: number[],
  transform: MacroTransform,
  frequency: string,
): number | null {
  if (values.length === 0) return null;
  if (transform === 'yoy') return yearOverYear(values, frequency);
  if (transform === 'diff' || transform === 'mom') return changeOver(values, 1);
  return values[0] ?? null;
}

/** 최근 n개의 평균. 모자라면 있는 만큼 쓰고, 하나도 없으면 null. */
export function movingAverage(values: number[], n: number): number | null {
  const slice = values.slice(0, n);
  if (slice.length === 0) return null;
  return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

/**
 * 삼 룰(Sahm rule) 갭. 실업률 3개월 평균이 직전 12개월 안의 최저 3개월 평균보다
 * 얼마나 높은지. 0.5%p 이상이면 침체 진입 신호로 본다.
 */
export function sahmGap(unemployment: number[]): number | null {
  const current = movingAverage(unemployment, 3);
  if (current == null || unemployment.length < 15) return null;

  let lowest = Infinity;
  // 직전 12개월 각각을 끝점으로 하는 3개월 평균 중 최저치를 찾는다.
  for (let start = 1; start <= 12; start += 1) {
    const avg = movingAverage(unemployment.slice(start), 3);
    if (avg != null && avg < lowest) lowest = avg;
  }
  if (lowest === Infinity) return null;
  return current - lowest;
}

/**
 * 순유동성(십억 달러). WALCL·WTREGEN은 백만, RRPONTSYD는 십억 단위로 내려오므로
 * 정규화 없이 빼면 1000배 어긋난다. docs/spec/macro-metrics.md 5절 참고.
 */
export function netLiquidity(
  walclMillions: number | null,
  tgaMillions: number | null,
  rrpBillions: number | null,
): number | null {
  if (walclMillions == null || tgaMillions == null || rrpBillions == null) return null;
  return walclMillions / 1000 - tgaMillions / 1000 - rrpBillions;
}

/** 연방기금 선물 가격에서 내재 정책금리를 뽑는다. 100 - 가격이 곧 금리(%)다. */
export function impliedRate(futuresPrice: number): number {
  return 100 - futuresPrice;
}

/** CME 월물 코드. 연방기금 선물 이월물 심볼을 만들 때 쓴다. */
const MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];

/**
 * 오늘 이후 count개월의 연방기금 선물 심볼. 야후는 이월물을 ZQ{월}{연2자리}.CBT로 받는다.
 * ZQ=F가 가리키는 최근월은 이미 다음 달일 수 있으므로, 넉넉히 만들어 두고
 * contractMonthKey로 최근월보다 뒤인 것만 골라 쓴다.
 */
export function fedFundsSymbols(today: Date, count = 3): string[] {
  const symbols: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, 1));
    const code = MONTH_CODES[date.getUTCMonth()];
    const year = String(date.getUTCFullYear()).slice(-2);
    symbols.push(`ZQ${code}${year}.CBT`);
  }
  return symbols;
}

/**
 * 계약 심볼을 시간 순서로 비교할 수 있는 수로 바꾼다(연*12 + 월).
 * ZQV26.CBT처럼 월물 코드와 두 자리 연도가 붙은 형태만 받는다.
 */
export function contractMonthKey(symbol: string): number | null {
  const match = /^ZQ([FGHJKMNQUVXZ])(\d{2})/.exec(symbol);
  if (!match) return null;
  const month = MONTH_CODES.indexOf(match[1]!);
  return (2000 + Number(match[2])) * 12 + month;
}
