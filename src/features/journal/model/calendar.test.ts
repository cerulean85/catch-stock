import { describe, expect, it } from 'vitest';
import {
  dayKey,
  gridRange,
  groupByDay,
  monthGridDays,
  parseMonth,
  shiftMonth,
} from './calendar';
import type { Journal } from './types';

const SEOUL = 'Asia/Seoul';

function journal(id: string, tradedAt: string): Journal {
  return {
    id,
    userId: 'u1',
    title: id,
    content: '',
    status: 'published',
    pinned: false,
    processScore: null,
    reviewNote: null,
    tickers: [],
    tags: [],
    tradeTypes: [],
    riskChecks: [],
    tradeQty: null,
    tradePrice: null,
    sellPrice: null,
    tradeFee: null,
    sentiment: null,
    horizon: null,
    targetReturn: null,
    actualReturn: null,
    linkedJournalId: null,
    reviewAt: null,
    reviewedAt: null,
    tradedAt: new Date(tradedAt),
    createdAt: new Date(tradedAt),
    updatedAt: new Date(tradedAt),
  };
}

describe('parseMonth', () => {
  const fallback = new Date('2026-08-05T01:00:00.000Z');

  it('유효한 YYYY-MM은 그대로 사용한다', () => {
    expect(parseMonth('2026-01', fallback, SEOUL)).toBe('2026-01');
  });

  it('형식이 틀리면 fallback 시점의 달을 쓴다', () => {
    expect(parseMonth(undefined, fallback, SEOUL)).toBe('2026-08');
    expect(parseMonth('2026-13', fallback, SEOUL)).toBe('2026-08');
    expect(parseMonth('20260801', fallback, SEOUL)).toBe('2026-08');
  });

  it('fallback은 사용자 시간대 기준으로 해석한다', () => {
    // UTC로는 7월 31일이지만 서울에서는 8월 1일.
    const utcJuly = new Date('2026-07-31T16:00:00.000Z');
    expect(parseMonth(undefined, utcJuly, SEOUL)).toBe('2026-08');
    expect(parseMonth(undefined, utcJuly, 'America/New_York')).toBe('2026-07');
  });
});

describe('monthGridDays', () => {
  it('일요일에서 시작해 토요일에서 끝난다', () => {
    const days = monthGridDays('2026-08');
    // 2026-08-01은 토요일 → 그리드는 7/26(일)부터.
    expect(days[0]).toBe('2026-07-26');
    expect(days[days.length - 1]).toBe('2026-09-05');
    expect(days.length % 7).toBe(0);
  });

  it('달의 모든 날짜를 포함한다', () => {
    const days = monthGridDays('2026-02');
    expect(days).toContain('2026-02-01');
    expect(days).toContain('2026-02-28');
  });
});

describe('gridRange', () => {
  it('그리드 양끝을 하루씩 넓힌 범위를 만든다', () => {
    const { from, to } = gridRange(['2026-07-26', '2026-09-05']);
    expect(from.toISOString()).toBe('2026-07-25T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-09-07T00:00:00.000Z');
  });
});

describe('dayKey / groupByDay', () => {
  it('시간대 기준으로 날짜를 묶는다', () => {
    const late = journal('a', '2026-08-04T16:00:00.000Z'); // 서울 8/5 01:00
    const early = journal('b', '2026-08-05T02:00:00.000Z'); // 서울 8/5 11:00

    expect(dayKey(late.tradedAt, SEOUL)).toBe('2026-08-05');

    const grouped = groupByDay([late, early], SEOUL);
    expect(grouped.get('2026-08-05')?.map((j) => j.id)).toEqual(['a', 'b']);

    // 뉴욕(UTC-4)에서는 둘 다 8/4.
    const ny = groupByDay([late, early], 'America/New_York');
    expect(ny.get('2026-08-04')?.map((j) => j.id)).toEqual(['a', 'b']);
    expect(ny.get('2026-08-05')).toBeUndefined();
  });
});

describe('shiftMonth', () => {
  it('연도 경계를 넘어간다', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});
