import { describe, expect, it } from 'vitest';
import { businessDaysBetween, periodLabel, readFreshness } from './freshness';

const SUNDAY = new Date('2026-08-23T09:00:00Z');

describe('businessDaysBetween', () => {
  it('주말은 세지 않는다', () => {
    // 금(21) 다음은 토·일뿐이라 영업일이 지나지 않았다.
    expect(businessDaysBetween(new Date('2026-08-21T00:00:00Z'), SUNDAY)).toBe(0);
    // 목(20) 다음은 금 하루.
    expect(businessDaysBetween(new Date('2026-08-20T00:00:00Z'), SUNDAY)).toBe(1);
    expect(businessDaysBetween(new Date('2026-08-14T00:00:00Z'), SUNDAY)).toBe(5);
  });
});

describe('readFreshness', () => {
  it('장이 닫힌 주말에는 금요일 자료가 최신이다', () => {
    const fresh = readFreshness('2026-08-21', 'D', SUNDAY);
    expect(fresh?.label).toBe('최신');
    expect(fresh?.stale).toBe(false);
  });

  it('일간 계열은 하루 지연까지 정상으로 본다', () => {
    expect(readFreshness('2026-08-20', 'D', SUNDAY)?.stale).toBe(false);
    expect(readFreshness('2026-08-19', 'D', SUNDAY)?.stale).toBe(true);
    expect(readFreshness('2026-08-19', 'D', SUNDAY)?.label).toBe('2영업일 전');
  });

  it('주간 계열은 2주가 넘으면 늦은 것으로 본다', () => {
    expect(readFreshness('2026-08-19', 'W', SUNDAY)?.stale).toBe(false);
    // 계속 실업수당처럼 한 주 더 밀려 나오는 계열은 경고로 치지 않는다.
    expect(readFreshness('2026-08-08', 'W', SUNDAY)?.stale).toBe(false);
    expect(readFreshness('2026-08-01', 'W', SUNDAY)?.stale).toBe(true);
  });

  it('월간·분기는 관측 기간 첫날로 찍혀서 늦었다고 판정하지 않는다', () => {
    // 7월분 CPI는 8월 하순에도 관측일이 07-01이다.
    expect(readFreshness('2026-07-01', 'M', SUNDAY)?.stale).toBe(false);
    expect(readFreshness('2026-04-01', 'Q', SUNDAY)?.stale).toBe(false);
  });

  it('월간·분기는 기간 이름으로 적는다', () => {
    expect(periodLabel('2026-07-01', 'M')).toBe('2026년 7월분');
    expect(periodLabel('2026-04-01', 'Q')).toBe('2026년 2분기분');
    expect(periodLabel('2026-08-21', 'D')).toBe('2026-08-21');
  });

  it('날짜가 아니면 판정하지 않는다', () => {
    expect(readFreshness('없음', 'D', SUNDAY)).toBeNull();
  });
});
