import { describe, expect, it } from 'vitest';
import { computeStats, splitByJournal, winRateGap } from './stats';
import type { RoundTrip } from './types';

function trip(pnl: number, returnPct: number, extra: Partial<RoundTrip> = {}): RoundTrip {
  return {
    scope: 'overseas',
    code: 'AAPL',
    name: 'Apple',
    currency: 'USD',
    quantity: 1,
    buyPrice: 100,
    sellPrice: 100 + pnl,
    fee: 0,
    pnl,
    returnPct,
    openedOn: '2026-01-01',
    closedOn: '2026-01-11',
    holdingDays: 10,
    journaled: false,
    ...extra,
  };
}

describe('computeStats', () => {
  it('승률·손익비·평균 보유기간을 낸다', () => {
    const stats = computeStats([
      trip(30, 30, { holdingDays: 20 }),
      trip(10, 10, { holdingDays: 10 }),
      trip(-10, -10, { holdingDays: 6 }),
    ]);

    expect(stats.count).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.winRate).toBeCloseTo(66.67, 2);
    expect(stats.avgWin).toBe(20);
    expect(stats.avgLoss).toBe(-10);
    // 평균이익 20% ÷ 평균손실 10% = 2
    expect(stats.payoffRatio).toBe(2);
    expect(stats.avgHoldingDays).toBe(12);
  });

  it('손실이 없으면 손익비를 내지 않는다', () => {
    // 0으로 나눠 Infinity를 만들지 않는다.
    expect(computeStats([trip(10, 10)]).payoffRatio).toBeNull();
  });

  it('본전(0)은 이익도 손실도 아니다', () => {
    const stats = computeStats([trip(0, 0), trip(10, 10)]);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.winRate).toBe(50);
  });

  it('매매가 없으면 비율을 null로 둔다', () => {
    const stats = computeStats([]);
    expect(stats.count).toBe(0);
    expect(stats.winRate).toBeNull();
    expect(stats.avgHoldingDays).toBeNull();
    expect(stats.pnlByCurrency).toEqual([]);
  });

  it('통화가 섞이면 손익을 통화별로 나눠 더한다', () => {
    const stats = computeStats([
      trip(100, 10, { currency: 'USD' }),
      trip(50, 5, { currency: 'USD' }),
      trip(30000, 3, { currency: 'KRW' }),
    ]);
    expect(stats.pnlByCurrency).toEqual([
      { currency: 'KRW', pnl: 30000 },
      { currency: 'USD', pnl: 150 },
    ]);
  });
});

describe('splitByJournal', () => {
  it('일지를 남긴 매매와 아닌 매매를 갈라 비교한다', () => {
    const split = splitByJournal([
      trip(10, 10, { journaled: true }),
      trip(20, 20, { journaled: true }),
      trip(-10, -10, { journaled: false }),
      trip(-5, -5, { journaled: false }),
      trip(5, 5, { journaled: false }),
    ]);

    expect(split.journaled.count).toBe(2);
    expect(split.journaled.winRate).toBe(100);
    expect(split.unjournaled.count).toBe(3);
    expect(split.unjournaled.winRate).toBeCloseTo(33.33, 2);
    // 일지를 남긴 매매의 승률이 66.7%p 높다.
    expect(winRateGap(split)).toBeCloseTo(66.67, 2);
  });

  it('한쪽이 비면 차이를 내지 않는다', () => {
    expect(winRateGap(splitByJournal([trip(10, 10, { journaled: true })]))).toBeNull();
  });
});
