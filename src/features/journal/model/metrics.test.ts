import { describe, expect, it } from 'vitest';
import { computeTradeMetrics, effectiveReturn } from './metrics';
import type { Journal } from './types';

describe('computeTradeMetrics', () => {
  it('총액 = 수량 × 단가 + 수수료', () => {
    const { totalCost } = computeTradeMetrics({ tradeQty: 10, tradePrice: 100, tradeFee: 5 });
    expect(totalCost).toBe(1005);
  });

  it('수수료 없으면 0으로 취급', () => {
    expect(computeTradeMetrics({ tradeQty: 2, tradePrice: 50 }).totalCost).toBe(100);
  });

  it('청산가가 있으면 수익률·손익 계산', () => {
    const m = computeTradeMetrics({ tradeQty: 10, tradePrice: 100, sellPrice: 120, tradeFee: 5 });
    expect(m.returnPct).toBeCloseTo(20);
    expect(m.pnlAmount).toBe((120 - 100) * 10 - 5);
  });

  it('손실도 음수로 계산', () => {
    const m = computeTradeMetrics({ tradeQty: 4, tradePrice: 100, sellPrice: 90 });
    expect(m.returnPct).toBeCloseTo(-10);
    expect(m.pnlAmount).toBe(-40);
  });

  it('청산가 없으면 수익률·손익은 null', () => {
    const m = computeTradeMetrics({ tradeQty: 10, tradePrice: 100 });
    expect(m.returnPct).toBeNull();
    expect(m.pnlAmount).toBeNull();
  });

  it('단가 0 또는 결측이면 수익률 null', () => {
    expect(computeTradeMetrics({ tradePrice: 0, sellPrice: 10 }).returnPct).toBeNull();
    expect(computeTradeMetrics({ sellPrice: 10 }).returnPct).toBeNull();
  });

  it('문자열 입력(도메인 객체)도 처리', () => {
    const m = computeTradeMetrics({ tradeQty: '10', tradePrice: '100', sellPrice: '110' });
    expect(m.returnPct).toBeCloseTo(10);
  });
});

function makeJournal(over: Partial<Journal>): Journal {
  return {
    id: 'x',
    userId: 'u',
    title: 't',
    content: 'c',
    status: 'published',
    tickers: ['AAPL'],
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
    tradedAt: new Date(0),
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...over,
  };
}

describe('effectiveReturn', () => {
  it('청산가 기반 계산값 우선', () => {
    const j = makeJournal({ tradePrice: '100', sellPrice: '150', actualReturn: '5' });
    expect(effectiveReturn(j)).toBeCloseTo(50);
  });

  it('청산가 없으면 수동 actualReturn 사용', () => {
    const j = makeJournal({ actualReturn: '7.5' });
    expect(effectiveReturn(j)).toBeCloseTo(7.5);
  });

  it('둘 다 없으면 null', () => {
    expect(effectiveReturn(makeJournal({}))).toBeNull();
  });
});
