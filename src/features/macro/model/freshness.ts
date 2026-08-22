/**
 * 자료가 얼마나 묵었는지. 발표 주기가 제각각이라 날짜만 보여주면
 * 정상인지 밀린 건지 알 수 없어서, 주기에 견줘 판정까지 해 준다.
 */
import type { MacroFrequency } from './types';

export interface Freshness {
  /** 기준일 이후 지난 영업일 수. 주말·휴장을 빼고 센다. */
  businessDays: number;
  /** 기준일 이후 지난 달력 일수. */
  days: number;
  /** 발표 주기에 견줘 늦었는지. */
  stale: boolean;
  label: string;
}

/**
 * 주간 계열이 이만큼 넘게 안 나오면 늦은 것으로 본다.
 * 계속 실업수당처럼 한 주 더 밀려 나오는 계열이 있어 2주치를 잡아 둔다.
 */
const WEEKLY_LIMIT_DAYS = 16;

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** from 다음 날부터 to까지의 영업일 수. 같은 날이거나 주말만 끼면 0이다. */
export function businessDaysBetween(from: Date, to: Date): number {
  let count = 0;
  const cursor = new Date(from.getTime());
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor <= to) {
    if (!isWeekend(cursor)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/**
 * 월간·분기 계열은 관측 기간의 첫날로 날짜가 찍혀서 늘 한두 달 지난 것처럼 보인다.
 * 그래서 늦었다는 판정은 일간·주간에만 매기고, 나머지는 기간만 보여준다.
 */
export function readFreshness(
  asOf: string,
  frequency: MacroFrequency,
  today: Date,
): Freshness | null {
  const date = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  const midnight = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const days = Math.max(0, Math.round((midnight.getTime() - date.getTime()) / 86_400_000));
  const businessDays = businessDaysBetween(date, midnight);

  if (frequency === 'D') {
    // 하루 지연까지는 정상이다. 장이 닫힌 주말에는 금요일 자료가 곧 최신이다.
    return {
      businessDays,
      days,
      stale: businessDays > 1,
      label: businessDays === 0 ? '최신' : `${businessDays}영업일 전`,
    };
  }

  if (frequency === 'W') {
    return {
      businessDays,
      days,
      stale: days > WEEKLY_LIMIT_DAYS,
      label: `${days}일 전`,
    };
  }

  return { businessDays, days, stale: false, label: `${days}일 전` };
}

/**
 * 관측 기간 이름. 월간·분기 계열은 기간의 첫날로 날짜가 찍혀서 날짜만 보여주면
 * 두 달 밀린 것처럼 읽힌다. "2026년 7월분"이라고 적어야 오해가 없다.
 */
export function periodLabel(asOf: string, frequency: MacroFrequency): string {
  const date = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return asOf;

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  if (frequency === 'M') return `${year}년 ${month}월분`;
  if (frequency === 'Q') return `${year}년 ${Math.floor((month - 1) / 3) + 1}분기분`;
  return asOf;
}
