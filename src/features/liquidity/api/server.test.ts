import { describe, expect, it } from 'vitest';
import { parseFredCsv } from '../model/parse';

describe('parseFredCsv', () => {
  it('normalizes FRED csv values and skips missing observations', () => {
    const csv = ['observation_date,WTREGEN', '2026-01-01,1000', '2026-01-08,', '2026-01-15,1550.5'].join(
      '\n',
    );

    expect(parseFredCsv(csv, 1 / 1000)).toEqual([
      { date: '2026-01-01', value: 1 },
      { date: '2026-01-15', value: 1.55 },
    ]);
  });
});
