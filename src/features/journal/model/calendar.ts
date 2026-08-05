import type { Journal } from './types';

/** 'YYYY-MM' 형식의 달. */
export type Month = string;

const MONTH_RE = /^(\d{4})-(\d{2})$/;

/** 'YYYY-MM' 문자열을 검증. 형식이 틀리면 fallback 시점의 달을 반환. */
export function parseMonth(value: string | undefined, fallback: Date, timeZone: string): Month {
  const m = value?.match(MONTH_RE);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return value as Month;
  return dayKey(fallback, timeZone).slice(0, 7);
}

/** Date를 사용자 시간대 기준 'YYYY-MM-DD'로 변환. */
export function dayKey(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(value);
}

/** 해당 달을 감싸는 달력 그리드(일요일 시작, 주 단위)의 날짜 키 목록. */
export function monthGridDays(month: Month): string[] {
  const [year, mon] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());

  const last = new Date(Date.UTC(year, mon, 0));
  const end = new Date(last);
  end.setUTCDate(last.getUTCDate() + (6 - last.getUTCDay()));

  const days: string[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/**
 * 그리드 전체를 담는 조회 범위. 사용자 시간대가 UTC와 최대 하루까지 어긋날 수 있어
 * 양끝을 하루씩 넓혀서 조회하고, 실제 날짜 배치는 클라이언트가 시간대 기준으로 한다.
 */
export function gridRange(days: string[]): { from: Date; to: Date } {
  const from = new Date(`${days[0]}T00:00:00.000Z`);
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date(`${days[days.length - 1]}T00:00:00.000Z`);
  to.setUTCDate(to.getUTCDate() + 2);
  return { from, to };
}

/** 일지를 사용자 시간대 기준 날짜별로 묶음. */
export function groupByDay(items: Journal[], timeZone: string): Map<string, Journal[]> {
  const map = new Map<string, Journal[]>();
  for (const item of items) {
    const key = dayKey(item.tradedAt, timeZone);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/** 이전/다음 달 키. */
export function shiftMonth(month: Month, delta: number): Month {
  const [year, mon] = month.split('-').map(Number);
  const d = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
