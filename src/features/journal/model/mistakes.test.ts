import { describe, expect, it } from 'vitest';
import type { Journal } from './types';
import { computeMistakes } from './mistakes';

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

const loss = (over: Partial<Journal>) =>
  makeJournal({ tradePrice: '100', sellPrice: '90', ...over });

describe('computeMistakes', () => {
  it('손절 미설정 손실 매매를 잡아낸다', () => {
    const list = [
      loss({ id: '1', riskChecks: [] }),
      loss({ id: '2', riskChecks: ['stopLoss'] }), // 손절 설정 → 제외
    ];
    const noStop = computeMistakes(list).find((m) => m.key === 'mistakeNoStopLoss');
    expect(noStop?.count).toBe(1);
    expect(noStop?.samples[0].id).toBe('1');
  });

  it('진입 근거 미기재를 잡아낸다', () => {
    const list = [loss({ id: '1', riskChecks: ['entryReason'] }), loss({ id: '2', riskChecks: [] })];
    const noReason = computeMistakes(list).find((m) => m.key === 'mistakeNoEntryReason');
    expect(noReason?.count).toBe(1);
  });

  it('같은 종목 2회 이상 손실만 반복 손실 종목으로 본다', () => {
    const list = [
      loss({ id: '1', tickers: ['AAPL'] }),
      loss({ id: '2', tickers: ['AAPL'] }),
      loss({ id: '3', tickers: ['MSFT'] }), // 1회 → 제외
    ];
    const losing = computeMistakes(list).filter((m) => m.key === 'mistakeLosingTicker');
    expect(losing).toHaveLength(1);
    expect(losing[0].detail).toBe('AAPL');
    expect(losing[0].count).toBe(2);
  });

  it('초안은 집계에서 제외한다', () => {
    const list = [loss({ id: '1', status: 'draft', riskChecks: [] })];
    expect(computeMistakes(list)).toHaveLength(0);
  });
});
