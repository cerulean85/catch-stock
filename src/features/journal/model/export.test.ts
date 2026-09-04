import { describe, expect, it } from 'vitest';
import { journalToMarkdown, journalsToCsv, slugifyTitle } from './export';
import type { Journal } from './types';

function makeJournal(over: Partial<Journal>): Journal {
  return {
    id: 'id-1',
    userId: 'u',
    title: 'AAPL 매수',
    content: '본문 내용',
    status: 'published',
    category: 'trade',
    contentFormat: 'markdown',
    pinned: false,
    processScore: null,
    reviewNote: null,
    tickers: ['AAPL'],
    tags: ['#가치투자'],
    tradeTypes: ['buy'],
    riskChecks: [],
    tradeQty: '10',
    tradePrice: '100',
    sellPrice: '120',
    tradeFee: '5',
    sentiment: 4,
    horizon: 'mid',
    targetReturn: null,
    actualReturn: null,
    linkedJournalId: null,
    reviewAt: null,
    reviewedAt: null,
    tradedAt: new Date('2026-01-02T03:04:00Z'),
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...over,
  };
}

describe('journalToMarkdown', () => {
  it('front-matter와 본문 포함, 계산값 반영', () => {
    const md = journalToMarkdown(makeJournal({}));
    expect(md).toContain('title: AAPL 매수');
    expect(md).toContain('returnPct: 20%');
    expect(md).toContain('# AAPL 매수');
    expect(md).toContain('본문 내용');
  });
});

describe('journalsToCsv', () => {
  it('헤더 + 행, effectiveReturn 계산', () => {
    const csv = journalsToCsv([makeJournal({})]);
    const [header, row] = csv.split('\r\n');
    expect(header.startsWith('id,tradedAt,category,title')).toBe(true);
    expect(row).toContain('AAPL 매수');
    expect(row.split(',')).toContain('20');
  });

  it('쉼표·따옴표 이스케이프', () => {
    const csv = journalsToCsv([makeJournal({ title: 'a, "b"' })]);
    expect(csv).toContain('"a, ""b"""');
  });
});

describe('slugifyTitle', () => {
  it('공백/특수문자 정리', () => {
    expect(slugifyTitle('AAPL Buy!! 2026')).toBe('aapl-buy-2026');
  });
  it('빈 값이면 fallback', () => {
    expect(slugifyTitle('!!!')).toBe('journal');
  });
});
