import { describe, expect, it } from 'vitest';
import { computeQuadrants, isValidProcessScore, quadrantOf } from './review';
import type { Journal } from './types';

function journal(over: Partial<Journal>): Journal {
  return {
    id: 'j1',
    userId: 'u1',
    title: '제목',
    content: '',
    status: 'published',
    category: 'trade',
    contentFormat: 'markdown',
    pinned: false,
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
    processScore: null,
    reviewNote: null,
    tradedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...over,
  };
}

describe('quadrantOf', () => {
  it('과정이 좋고 벌었으면 실력으로 본다', () => {
    expect(quadrantOf(journal({ processScore: 5, actualReturn: '12' }))).toBe('quadrantSkill');
  });

  it('과정이 좋았는데 잃었으면 운이 나빴던 것으로 본다', () => {
    // 이런 매매는 방식을 바꾸지 않아도 된다는 게 사분면의 핵심이다.
    expect(quadrantOf(journal({ processScore: 4, actualReturn: '-8' }))).toBe('quadrantUnlucky');
  });

  it('과정이 미흡한데 벌었으면 운이 좋았던 것으로 본다', () => {
    expect(quadrantOf(journal({ processScore: 2, actualReturn: '20' }))).toBe('quadrantLucky');
  });

  it('과정도 미흡하고 잃었으면 고칠 매매로 본다', () => {
    expect(quadrantOf(journal({ processScore: 1, actualReturn: '-5' }))).toBe('quadrantDeserved');
  });

  it('청산가로 계산한 수익률도 결과로 인정한다', () => {
    const j = journal({ processScore: 5, tradeQty: '10', tradePrice: '100', sellPrice: '120' });
    expect(quadrantOf(j)).toBe('quadrantSkill');
  });

  it('회고 전이거나 결과가 없으면 사분면에 넣지 않는다', () => {
    expect(quadrantOf(journal({ processScore: null, actualReturn: '10' }))).toBeNull();
    expect(quadrantOf(journal({ processScore: 5, actualReturn: null }))).toBeNull();
    // 정확히 본전이면 이익도 손실도 아니라 판단을 미룬다.
    expect(quadrantOf(journal({ processScore: 5, actualReturn: '0' }))).toBeNull();
  });
});

describe('computeQuadrants', () => {
  it('네 칸을 항상 같은 순서로 돌려준다', () => {
    expect(computeQuadrants([]).map((b) => [b.key, b.count])).toEqual([
      ['quadrantSkill', 0],
      ['quadrantUnlucky', 0],
      ['quadrantLucky', 0],
      ['quadrantDeserved', 0],
    ]);
  });

  it('일지를 사분면별로 세고 대표 사례를 최대 3건 담는다', () => {
    const lucky = Array.from({ length: 5 }, (_, i) =>
      journal({ id: `l${i}`, title: `운 ${i}`, processScore: 2, actualReturn: '10' }),
    );
    const buckets = computeQuadrants([
      ...lucky,
      journal({ id: 's1', processScore: 5, actualReturn: '10' }),
      journal({ id: 'x1', processScore: null, actualReturn: '10' }),
    ]);

    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
    expect(byKey.quadrantLucky.count).toBe(5);
    expect(byKey.quadrantLucky.journals).toHaveLength(3);
    expect(byKey.quadrantSkill.count).toBe(1);
    // 회고 전 일지는 어느 칸에도 들어가지 않는다.
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(6);
  });
});

describe('isValidProcessScore', () => {
  it('1~5 정수만 받는다', () => {
    expect(isValidProcessScore(1)).toBe(true);
    expect(isValidProcessScore(5)).toBe(true);
    expect(isValidProcessScore(0)).toBe(false);
    expect(isValidProcessScore(6)).toBe(false);
    expect(isValidProcessScore(3.5)).toBe(false);
    expect(isValidProcessScore(Number.NaN)).toBe(false);
  });
});
