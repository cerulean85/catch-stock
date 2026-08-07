import { describe, expect, it } from 'vitest';
import { defaultDirection, nextSort, sortHoldings } from './sort';
import type { Holding } from './types';

function holding(over: Partial<Holding>): Holding {
  return {
    scope: 'overseas',
    code: 'X',
    name: 'X',
    quantity: 0,
    avgPrice: 0,
    currentPrice: 0,
    evalAmount: 0,
    pnlAmount: 0,
    pnlRate: 0,
    currency: 'USD',
    evalAmountKrw: null,
    ...over,
  };
}

const ITEMS = [
  holding({ code: 'AAPL', name: 'APPLE', evalAmount: 1000, pnlAmount: -50 }),
  holding({ code: 'MSFT', name: 'MICROSOFT', evalAmount: 3000, pnlAmount: 120 }),
  holding({ code: 'TSLA', name: 'TESLA', evalAmount: 2000, pnlAmount: 300 }),
];

const codes = (items: Holding[]) => items.map((h) => h.code);

describe('defaultDirection', () => {
  it('이름은 오름차순, 숫자는 내림차순으로 시작한다', () => {
    expect(defaultDirection('name')).toBe('asc');
    expect(defaultDirection('evalAmount')).toBe('desc');
  });
});

describe('nextSort', () => {
  it('같은 컬럼을 다시 누르면 방향만 뒤집는다', () => {
    expect(nextSort({ key: 'evalAmount', direction: 'desc' }, 'evalAmount')).toEqual({
      key: 'evalAmount',
      direction: 'asc',
    });
  });

  it('다른 컬럼을 누르면 그 컬럼의 기본 방향으로 간다', () => {
    expect(nextSort({ key: 'evalAmount', direction: 'asc' }, 'name')).toEqual({
      key: 'name',
      direction: 'asc',
    });
    expect(nextSort(null, 'pnlAmount')).toEqual({ key: 'pnlAmount', direction: 'desc' });
  });
});

describe('sortHoldings', () => {
  it('정렬이 없으면 원래 순서 그대로', () => {
    expect(sortHoldings(ITEMS, null)).toBe(ITEMS);
  });

  it('숫자 컬럼을 양방향으로 정렬한다', () => {
    expect(codes(sortHoldings(ITEMS, { key: 'evalAmount', direction: 'desc' }))).toEqual([
      'MSFT',
      'TSLA',
      'AAPL',
    ]);
    expect(codes(sortHoldings(ITEMS, { key: 'evalAmount', direction: 'asc' }))).toEqual([
      'AAPL',
      'TSLA',
      'MSFT',
    ]);
  });

  it('손익은 음수도 제대로 줄 세운다', () => {
    expect(codes(sortHoldings(ITEMS, { key: 'pnlAmount', direction: 'asc' }))).toEqual([
      'AAPL',
      'MSFT',
      'TSLA',
    ]);
  });

  it('이름은 로케일 기준으로 비교한다', () => {
    const korean = [
      holding({ code: '000660', name: '하이닉스' }),
      holding({ code: '005930', name: '삼성전자' }),
    ];
    expect(codes(sortHoldings(korean, { key: 'name', direction: 'asc' }))).toEqual([
      '005930',
      '000660',
    ]);
  });

  it('값이 같으면 종목코드로 안정적으로 고정한다', () => {
    const tied = [
      holding({ code: 'ZZZ', evalAmount: 100 }),
      holding({ code: 'AAA', evalAmount: 100 }),
    ];
    expect(codes(sortHoldings(tied, { key: 'evalAmount', direction: 'desc' }))).toEqual([
      'AAA',
      'ZZZ',
    ]);
  });

  it('입력 배열을 변형하지 않는다', () => {
    const before = codes(ITEMS);
    sortHoldings(ITEMS, { key: 'evalAmount', direction: 'asc' });
    expect(codes(ITEMS)).toEqual(before);
  });
});
