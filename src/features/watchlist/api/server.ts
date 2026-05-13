import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import YahooFinance from 'yahoo-finance2';
import { db } from '@/shared/db/client';
import { journals, watchlistItems } from '@/shared/db/schema';
import { rsi14 } from '@/shared/lib/rsi';
import { fetchDailyBars, fetchMonthlyBars } from '@/shared/lib/yahoo';
import type { WatchlistItem, WatchlistJournal, WatchlistNews, WatchlistResult } from '../model/types';

const DEFAULT_SYMBOLS = ['NVDA', 'MSFT', 'AAPL', 'SPY'];
const MAX_SYMBOLS = 20;

const client = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

interface YahooQuote {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
}

interface YahooSearchNews {
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: Date;
}

export async function getWatchlistResult(userId?: string | null): Promise<WatchlistResult> {
  const authenticated = !!userId;
  const symbols = authenticated ? await listWatchlistSymbols(userId) : DEFAULT_SYMBOLS;
  const effectiveSymbols = symbols;
  if (effectiveSymbols.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      authenticated,
      symbols,
      items: [],
    };
  }

  const [quotes, journalsBySymbol, latestNewsBySymbol, rsiBySymbol] = await Promise.all([
    fetchQuotes(effectiveSymbols),
    authenticated
      ? fetchRecentJournals(userId, effectiveSymbols)
      : new Map<string, WatchlistJournal[]>(),
    fetchLatestNews(effectiveSymbols),
    fetchRsi(effectiveSymbols),
  ]);

  const items: WatchlistItem[] = effectiveSymbols.map((symbol) => {
    const quote = quotes.get(symbol);
    const rsi = rsiBySymbol.get(symbol);
    return {
      symbol,
      name: quote?.longName ?? quote?.shortName ?? symbol,
      price: quote?.regularMarketPrice ?? null,
      changePercent: quote?.regularMarketChangePercent ?? null,
      dailyRSI14: rsi?.daily ?? null,
      monthlyRSI14: rsi?.monthly ?? null,
      newsUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/news/`,
      latestNews: latestNewsBySymbol.get(symbol) ?? null,
      lastJournalAt: journalsBySymbol.get(symbol)?.[0]?.tradedAt ?? null,
      recentJournals: journalsBySymbol.get(symbol) ?? [],
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    authenticated,
    symbols,
    items,
  };
}

export async function addWatchlistSymbol(userId: string, rawSymbol: string): Promise<void> {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) throw new Error('symbol_required');

  const existing = await listWatchlistSymbols(userId);
  if (!existing.includes(symbol) && existing.length >= MAX_SYMBOLS) {
    throw new Error('watchlist_limit');
  }

  await db
    .insert(watchlistItems)
    .values({ userId, symbol })
    .onConflictDoNothing();
}

export async function removeWatchlistSymbol(userId: string, rawSymbol: string): Promise<void> {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) throw new Error('symbol_required');

  await db
    .delete(watchlistItems)
    .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.symbol, symbol)));
}

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '').slice(0, 16);
}

async function listWatchlistSymbols(userId: string): Promise<string[]> {
  const rows = await db
    .select({ symbol: watchlistItems.symbol })
    .from(watchlistItems)
    .where(eq(watchlistItems.userId, userId))
    .orderBy(watchlistItems.createdAt);
  return rows.map((row) => row.symbol);
}

async function fetchQuotes(symbols: string[]): Promise<Map<string, YahooQuote>> {
  const quotes = (await client.quote(symbols, { return: 'array' })) as YahooQuote[];
  const entries: Array<[string, YahooQuote]> = [];
  for (const quote of quotes) {
    if (quote.symbol) entries.push([quote.symbol, quote]);
  }
  return new Map(entries);
}

async function fetchRecentJournals(
  userId: string,
  symbols: string[],
): Promise<Map<string, WatchlistJournal[]>> {
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      const rows = await db
        .select({ id: journals.id, title: journals.title, tradedAt: journals.tradedAt })
        .from(journals)
        .where(and(eq(journals.userId, userId), sql`${journals.tickers} @> ARRAY[${symbol}]::text[]`))
        .orderBy(desc(journals.tradedAt))
        .limit(3);
      return [
        symbol,
        rows.map((row) => ({
          id: row.id,
          title: row.title,
          tradedAt: row.tradedAt.toISOString(),
        })),
      ] as const;
    }),
  );

  return new Map(entries);
}

async function fetchLatestNews(symbols: string[]): Promise<Map<string, WatchlistNews>> {
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const result = await client.search(symbol, {
          quotesCount: 0,
          newsCount: 1,
          region: 'US',
          lang: 'en-US',
        });
        const news = (result.news?.[0] ?? null) as YahooSearchNews | null;
        if (!news?.title || !news.link || !news.providerPublishTime) return null;
        return [
          symbol,
          {
            title: news.title,
            publisher: news.publisher ?? 'Yahoo Finance',
            url: news.link,
            publishedAt: news.providerPublishTime.toISOString(),
          },
        ] as const;
      } catch {
        return null;
      }
    }),
  );

  return new Map(entries.filter((entry): entry is readonly [string, WatchlistNews] => entry !== null));
}

async function fetchRsi(
  symbols: string[],
): Promise<Map<string, { daily: number | null; monthly: number | null }>> {
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const [daily, monthly] = await Promise.all([
          fetchDailyBars(symbol),
          fetchMonthlyBars(symbol),
        ]);
        return [
          symbol,
          {
            daily: daily ? round2(rsi14(daily.closes)) : null,
            monthly: monthly ? round2(rsi14(monthly.closes)) : null,
          },
        ] as const;
      } catch {
        return [symbol, { daily: null, monthly: null }] as const;
      }
    }),
  );

  return new Map(entries);
}

function round2(value: number | null): number | null {
  return value == null ? null : Math.round(value * 100) / 100;
}
