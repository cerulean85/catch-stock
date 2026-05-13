import YahooFinance from 'yahoo-finance2';

export interface PriceBars {
  closes: number[];
  lastClose: number;
  asOf: Date;
}

const client = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const DAY_MS = 24 * 60 * 60 * 1000;

function dateAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

async function fetchCloses(
  symbol: string,
  interval: '1d' | '1mo',
  period1: Date,
): Promise<PriceBars | null> {
  const result = await client.chart(symbol, { period1, interval });
  const quotes = result.quotes ?? [];
  const closes: number[] = [];
  let lastClose: number | null = null;
  let asOf: Date | null = null;
  for (const q of quotes) {
    if (q.close == null) continue;
    closes.push(q.close);
    lastClose = q.close;
    asOf = q.date;
  }
  if (lastClose == null || asOf == null) return null;
  return { closes, lastClose, asOf };
}

export async function fetchDailyBars(symbol: string): Promise<PriceBars | null> {
  return fetchCloses(symbol, '1d', dateAgo(120));
}

export async function fetchMonthlyBars(symbol: string): Promise<PriceBars | null> {
  return fetchCloses(symbol, '1mo', dateAgo(36 * 31));
}
