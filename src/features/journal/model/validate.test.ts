import { describe, expect, it } from 'vitest';
import { JournalValidationError, parseJournalInput } from './validate';

function makeForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe('parseJournalInput', () => {
  it('throws when title is empty', () => {
    const fd = makeForm({
      title: '',
      content: 'body',
      tickers: JSON.stringify(['AAPL']),
    });
    expect(() => parseJournalInput(fd)).toThrow(JournalValidationError);
  });

  it('throws when title is too long', () => {
    const fd = makeForm({
      title: 'a'.repeat(101),
      content: 'body',
      tickers: JSON.stringify(['AAPL']),
    });
    expect(() => parseJournalInput(fd)).toThrow(JournalValidationError);
  });

  it('allows publishing without a ticker', () => {
    const fd = makeForm({
      title: 'ok',
      content: 'body',
      tickers: JSON.stringify([]),
    });
    const input = parseJournalInput(fd);
    expect(input.tickers).toEqual([]);
    expect(input.status).toBe('published');
  });

  it('keeps a known category and falls back to trade otherwise', () => {
    const base = { title: 'ok', content: 'body' };
    expect(parseJournalInput(makeForm({ ...base, category: 'market' })).category).toBe('market');
    expect(parseJournalInput(makeForm({ ...base, category: 'study' })).category).toBe('study');
    expect(parseJournalInput(makeForm({ ...base, category: 'wat' })).category).toBe('trade');
    expect(parseJournalInput(makeForm(base)).category).toBe('trade');
  });

  it('normalizes tickers to uppercase and filters invalid trade types', () => {
    const fd = makeForm({
      title: 'ok',
      content: 'body',
      tickers: JSON.stringify(['aapl', 'msft']),
      tags: JSON.stringify(['#가치투자', '#리스크']),
      tradeTypes: JSON.stringify(['buy', 'wat']),
    });
    const input = parseJournalInput(fd);
    expect(input.tickers).toEqual(['AAPL', 'MSFT']);
    expect(input.tags).toEqual(['#가치투자', '#리스크']);
    expect(input.tradeTypes).toEqual(['buy']);
  });

  it('clamps sentiment to integer 1..5 or null', () => {
    const base = {
      title: 'ok',
      content: 'body',
      tickers: JSON.stringify(['AAPL']),
    };
    expect(parseJournalInput(makeForm({ ...base, sentiment: '3' })).sentiment).toBe(3);
    expect(parseJournalInput(makeForm({ ...base, sentiment: '0' })).sentiment).toBeNull();
    expect(parseJournalInput(makeForm({ ...base, sentiment: '6' })).sentiment).toBeNull();
    expect(parseJournalInput(makeForm({ ...base, sentiment: '' })).sentiment).toBeNull();
  });

  it('defaults status to published and accepts draft', () => {
    const base = {
      title: 'ok',
      content: 'body',
      tickers: JSON.stringify(['AAPL']),
    };
    expect(parseJournalInput(makeForm(base)).status).toBe('published');
    expect(parseJournalInput(makeForm({ ...base, status: 'draft' })).status).toBe('draft');
    // 알 수 없는 값은 published로 떨어진다.
    expect(parseJournalInput(makeForm({ ...base, status: 'weird' })).status).toBe('published');
  });

  it('allows an empty body for a draft only', () => {
    const base = { title: '쓰다 만 글', content: '', tickers: JSON.stringify([]) };
    expect(parseJournalInput(makeForm({ ...base, status: 'draft' })).content).toBe('');
    expect(() => parseJournalInput(makeForm(base))).toThrow(JournalValidationError);
  });

  it('still requires a title for a draft', () => {
    const fd = makeForm({ title: '', content: '', status: 'draft' });
    expect(() => parseJournalInput(fd)).toThrow(JournalValidationError);
  });

  it('parses numeric trade fields and ignores non-numeric', () => {
    const fd = makeForm({
      title: 'ok',
      content: 'body',
      tickers: JSON.stringify(['AAPL']),
      tradeQty: '10',
      tradePrice: '187.5',
      tradeFee: 'abc',
    });
    const input = parseJournalInput(fd);
    expect(input.tradeQty).toBe(10);
    expect(input.tradePrice).toBe(187.5);
    expect(input.tradeFee).toBeNull();
  });
});
