import 'server-only';
import YahooFinance from 'yahoo-finance2';
import { TICKER_SYMBOLS, type TickerQuote } from '../model/symbols';

const client = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/** 모든 페이지 상단에 붙기 때문에 요청마다 부르지 않고 잠깐 재사용한다. */
const TTL_MS = 60 * 1000;

let cached: { value: TickerQuote[]; expiresAt: number } | null = null;

/**
 * 지표 시세를 한 번에 조회한다. 실패하거나 값이 없는 심볼은 조용히 빼고,
 * 전부 실패하면 빈 배열 — 상단 바 때문에 페이지가 깨지면 안 된다.
 */
export async function getTickerQuotes(): Promise<TickerQuote[]> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let quotes: TickerQuote[] = [];
  try {
    const symbols = TICKER_SYMBOLS.map((s) => s.symbol);
    const results = await client.quote(symbols);
    const bySymbol = new Map(
      (Array.isArray(results) ? results : [results]).map((q) => [q?.symbol, q]),
    );

    quotes = TICKER_SYMBOLS.flatMap(({ label, symbol }) => {
      const quote = bySymbol.get(symbol);
      const price = quote?.regularMarketPrice;
      if (price == null) return [];
      return [{ label, price, changePercent: quote?.regularMarketChangePercent ?? 0 }];
    });
  } catch {
    // 시세 조회 실패는 화면에서 바를 감추는 것으로 끝낸다.
    quotes = [];
  }

  // 실패했어도 캐시해서 매 요청마다 재시도하지 않는다.
  cached = { value: quotes, expiresAt: Date.now() + TTL_MS };
  return quotes;
}
