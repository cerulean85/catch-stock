import { describe, expect, it } from 'vitest';
import {
  applyTransform,
  changeOver,
  contractMonthKey,
  fedFundsSymbols,
  impliedRate,
  movingAverage,
  netLiquidity,
  sahmGap,
  yearOverYear,
} from './compute';

describe('changeOver / yearOverYear', () => {
  it('n기 전과의 차이를 낸다', () => {
    expect(changeOver([10, 8, 6], 1)).toBe(2);
    expect(changeOver([10, 8, 6], 2)).toBe(4);
  });

  it('자료가 모자라면 null', () => {
    expect(changeOver([10], 1)).toBeNull();
  });

  it('월간 계열은 12개 전과 비교한다', () => {
    const values = [110, ...Array(11).fill(105), 100];
    expect(yearOverYear(values, 'M')).toBeCloseTo(10, 6);
  });

  it('기준값이 0이면 나눌 수 없다', () => {
    expect(yearOverYear([110, ...Array(11).fill(1), 0], 'M')).toBeNull();
  });
});

describe('applyTransform', () => {
  const monthly = [110, ...Array(11).fill(105), 100];

  it('transform별로 다른 값을 만든다', () => {
    expect(applyTransform(monthly, 'yoy', 'M')).toBeCloseTo(10, 6);
    expect(applyTransform([110, 105], 'diff', 'M')).toBe(5);
    expect(applyTransform([110, 105], 'level', 'M')).toBe(110);
  });

  it('값이 없으면 null', () => {
    expect(applyTransform([], 'level', 'M')).toBeNull();
  });
});

describe('sahmGap', () => {
  it('실업률이 바닥 대비 올라온 폭을 잰다', () => {
    // 최근 3개월 평균 4.2, 직전 12개월 안의 최저 3개월 평균 3.6 → 0.6%p
    const unemployment = [
      4.3, 4.2, 4.1, 4.0, 3.9, 3.8, 3.7, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6,
    ];
    expect(sahmGap(unemployment)).toBeCloseTo(0.6, 6);
  });

  it('15개월이 안 되면 판정하지 않는다', () => {
    expect(sahmGap([4.3, 4.2, 4.1])).toBeNull();
  });
});

describe('movingAverage', () => {
  it('있는 만큼만 평균 낸다', () => {
    expect(movingAverage([3, 6], 3)).toBe(4.5);
    expect(movingAverage([], 3)).toBeNull();
  });
});

describe('netLiquidity', () => {
  it('백만·십억이 섞인 단위를 맞춰 계산한다', () => {
    // 2026-08-23 실제 값: WALCL 6,745,699(백만) TGA 953,612(백만) RRP 0.2(십억)
    expect(netLiquidity(6745699, 953612, 0.2)).toBeCloseTo(5791.887, 3);
  });

  it('하나라도 없으면 계산하지 않는다', () => {
    expect(netLiquidity(6745699, null, 0.2)).toBeNull();
  });
});

describe('연방기금 선물', () => {
  it('가격에서 내재 금리를 뽑는다', () => {
    // 2026-08-23 ZQ=F 96.265 → 3.735%
    expect(impliedRate(96.265)).toBeCloseTo(3.735, 6);
  });

  it('다음 달부터의 이월물 심볼을 만든다', () => {
    expect(fedFundsSymbols(new Date('2026-08-23T00:00:00Z'))).toEqual([
      'ZQU26.CBT',
      'ZQV26.CBT',
      'ZQX26.CBT',
    ]);
  });

  it('계약 심볼을 시간 순서로 비교할 수 있게 만든다', () => {
    const october = contractMonthKey('ZQV26.CBT')!;
    expect(contractMonthKey('ZQX26.CBT')!).toBeGreaterThan(october);
    expect(contractMonthKey('ZQU26.CBT')!).toBeLessThan(october);
    // 해를 넘겨도 순서가 유지돼야 한다.
    expect(contractMonthKey('ZQF27.CBT')!).toBeGreaterThan(contractMonthKey('ZQZ26.CBT')!);
    expect(contractMonthKey('ZQ=F')).toBeNull();
  });

  it('연말에는 해를 넘긴다', () => {
    expect(fedFundsSymbols(new Date('2026-12-15T00:00:00Z'))).toEqual([
      'ZQF27.CBT',
      'ZQG27.CBT',
      'ZQH27.CBT',
    ]);
  });
});
