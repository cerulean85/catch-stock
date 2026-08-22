import 'server-only';
import YahooFinance from 'yahoo-finance2';

const client = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface Quote {
  price: number;
  change: number;
  /** 시세가 찍힌 날(YYYY-MM-DD). 얼마나 묵었는지 화면에 보여주려면 필요하다. */
  asOf?: string;
  /** 선물 최근월이 실제로 어느 계약인지. ZQ=F가 가리키는 달을 알아야 곡선을 이을 수 있다. */
  underlyingSymbol?: string;
}

/**
 * 여러 심볼의 현재가를 한 번에 받는다. 값이 없는 심볼은 빠진 채로 돌아오므로
 * 호출부가 Map에 없는 심볼을 실패로 처리한다.
 */
export async function fetchQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const quotes = new Map<string, Quote>();
  if (symbols.length === 0) return quotes;

  await collect(symbols, quotes);
  // 일괄 조회가 심볼 하나둘을 간헐적으로 빠뜨린다. 빠진 것만 한 번 더 묻는다.
  const missing = symbols.filter((symbol) => !quotes.has(symbol));
  if (missing.length > 0) await collect(missing, quotes).catch(() => {});
  return quotes;
}

async function collect(symbols: string[], quotes: Map<string, Quote>): Promise<void> {
  const results = await client.quote(symbols);
  for (const quote of Array.isArray(results) ? results : [results]) {
    const price = quote?.regularMarketPrice;
    if (quote?.symbol == null || price == null) continue;
    const time = quote.regularMarketTime;
    quotes.set(quote.symbol, {
      price,
      change: quote.regularMarketChange ?? 0,
      asOf: time instanceof Date ? time.toISOString().slice(0, 10) : undefined,
      underlyingSymbol: quote.underlyingSymbol,
    });
  }
}

/**
 * 스파크라인용 일별 종가. quote는 현재가만 주므로 차트를 따로 받는다.
 * 실패하면 빈 배열 — 추세선이 없다고 카드를 접을 이유는 없다.
 */
export interface Close {
  date: string;
  close: number;
}

export async function fetchDailyCloses(symbol: string, days: number): Promise<Close[]> {
  const period1 = new Date(Date.now() - days * 86_400_000);
  try {
    const chart = await client.chart(symbol, { period1, interval: '1d' });
    return (chart?.quotes ?? []).flatMap((row) => {
      const close = row.close;
      if (typeof close !== 'number' || !Number.isFinite(close)) return [];
      return [{ date: new Date(row.date).toISOString().slice(0, 10), close }];
    });
  } catch {
    return [];
  }
}
