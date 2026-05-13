import 'server-only';
import YahooFinance from 'yahoo-finance2';
import type {
  EconomicCalendarLink,
  MarketIndicator,
  MarketNewsItem,
  MarketNewsResult,
  NewsTopic,
} from '../model/types';

const TTL_MS = 10 * 60 * 1000;
const MAX_ITEMS = 6;
const BLOCKED_PUBLISHERS = new Set([
  'ACCESSWIRE',
  'Business Wire',
  'GlobeNewswire',
  'Insider Monkey',
  'PR Newswire',
  'Reportlinker',
]);
const BLOCKED_TITLE_PATTERNS = [/market,\s*(?:till|to)\s*20\d{2}/i, /industry report/i];

const client = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const topics: NewsTopic[] = [
  { id: 'market', label: 'Market', query: 'S&P 500' },
  { id: 'macro', label: 'Macro', query: 'Federal Reserve' },
  { id: 'ai', label: 'AI & Chips', query: 'NVDA' },
  { id: 'energy', label: 'Energy', query: 'crude oil' },
];

const indicatorConfigs = [
  { symbol: '^GSPC', label: 'S&P 500', newsPath: '%5EGSPC', group: 'market' },
  { symbol: '^IXIC', label: 'Nasdaq', newsPath: '%5EIXIC', group: 'market' },
  { symbol: '^DJI', label: 'Dow', newsPath: '%5EDJI', group: 'market' },
  { symbol: '^TNX', label: '10Y Yield', newsPath: '%5ETNX', group: 'market' },
  { symbol: 'CL=F', label: 'WTI Oil', newsPath: 'CL%3DF', group: 'market' },
  { symbol: 'XLK', label: 'Technology', newsPath: 'XLK', group: 'sector' },
  { symbol: 'XLF', label: 'Financials', newsPath: 'XLF', group: 'sector' },
  { symbol: 'XLE', label: 'Energy', newsPath: 'XLE', group: 'sector' },
  { symbol: 'XLY', label: 'Consumer Disc.', newsPath: 'XLY', group: 'sector' },
  { symbol: 'XLV', label: 'Health Care', newsPath: 'XLV', group: 'sector' },
] as const;

const calendarLinks: EconomicCalendarLink[] = [
  {
    label: 'Economic Calendar',
    description: 'CPI, PPI, 고용, FOMC 일정',
    url: 'https://finance.yahoo.com/calendar/economic/',
  },
  {
    label: 'Earnings Calendar',
    description: '주요 기업 실적 발표 일정',
    url: 'https://finance.yahoo.com/calendar/earnings/',
  },
];

interface CacheEntry {
  at: number;
  result: MarketNewsResult;
}

type GlobalWithCache = typeof globalThis & {
  __marketNewsCache?: CacheEntry | null;
};

interface YahooSearchNews {
  uuid?: string;
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: Date;
  relatedTickers?: string[];
  thumbnail?: {
    resolutions?: Array<{ url?: string; width?: number; height?: number }>;
  };
}

interface YahooQuote {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
}

function readCache(): CacheEntry | null {
  return (globalThis as GlobalWithCache).__marketNewsCache ?? null;
}

function writeCache(entry: CacheEntry | null): void {
  (globalThis as GlobalWithCache).__marketNewsCache = entry;
}

export async function getMarketNews(opts: { refresh?: boolean } = {}): Promise<MarketNewsResult> {
  const cached = readCache();
  if (!opts.refresh && cached && Date.now() - cached.at < TTL_MS) {
    return {
      ...cached.result,
      cache: { hit: true, ttlSeconds: Math.floor((TTL_MS - (Date.now() - cached.at)) / 1000) },
    };
  }

  const [batches, indicators] = await Promise.all([
    Promise.all(topics.map(fetchTopicNews)),
    fetchIndicators(),
  ]);
  const seen = new Set<string>();
  const dedupedBatches = batches.map((batch) =>
    batch.filter((item) => {
      const key = item.url || item.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
  const items = interleave(dedupedBatches)
    .slice(0, MAX_ITEMS)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const result: MarketNewsResult = {
    generatedAt: new Date().toISOString(),
    cache: { hit: false, ttlSeconds: Math.floor(TTL_MS / 1000) },
    topics,
    indicators,
    calendarLinks,
    items,
  };

  writeCache({ at: Date.now(), result });
  return result;
}

async function fetchIndicators(): Promise<MarketIndicator[]> {
  const quotes = (await client.quote(
    indicatorConfigs.map((config) => config.symbol),
    { return: 'array' },
  )) as YahooQuote[];
  const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));

  return indicatorConfigs.map((config) => {
    const quote = bySymbol.get(config.symbol);
    return {
      symbol: config.symbol,
      label: config.label,
      newsUrl: `https://finance.yahoo.com/quote/${config.newsPath}/news/`,
      group: config.group,
      value: quote?.regularMarketPrice ?? null,
      change: quote?.regularMarketChange ?? null,
      changePercent: quote?.regularMarketChangePercent ?? null,
    };
  });
}

async function fetchTopicNews(topic: NewsTopic): Promise<MarketNewsItem[]> {
  const result = await client.search(topic.query, {
    quotesCount: 0,
    newsCount: 15,
    region: 'US',
    lang: 'en-US',
  });

  return ((result.news ?? []) as YahooSearchNews[])
    .map((item) => normalizeNewsItem(item, topic))
    .filter((item): item is MarketNewsItem => item !== null);
}

function normalizeNewsItem(item: YahooSearchNews, topic: NewsTopic): MarketNewsItem | null {
  if (!item.title || !item.link || !item.providerPublishTime) return null;
  if (item.publisher && BLOCKED_PUBLISHERS.has(item.publisher)) return null;
  if (BLOCKED_TITLE_PATTERNS.some((pattern) => pattern.test(item.title ?? ''))) return null;

  const thumbnailUrl =
    item.thumbnail?.resolutions
      ?.filter((resolution) => resolution.url)
      .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;

  return {
    id: item.uuid ?? item.link,
    title: item.title,
    publisher: item.publisher ?? 'Yahoo Finance',
    url: item.link,
    publishedAt: item.providerPublishTime.toISOString(),
    topic: topic.label,
    relatedTickers: item.relatedTickers ?? [],
    thumbnailUrl,
  };
}

function interleave(batches: MarketNewsItem[][]): MarketNewsItem[] {
  const items: MarketNewsItem[] = [];
  const maxLength = Math.max(...batches.map((batch) => batch.length), 0);
  for (let index = 0; index < maxLength; index += 1) {
    for (const batch of batches) {
      const item = batch[index];
      if (item) items.push(item);
    }
  }
  return items;
}
