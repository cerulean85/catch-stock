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

  it('throws when no ticker', () => {
    const fd = makeForm({
      title: 'ok',
      content: 'body',
      tickers: JSON.stringify([]),
    });
    expect(() => parseJournalInput(fd)).toThrow(JournalValidationError);
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
