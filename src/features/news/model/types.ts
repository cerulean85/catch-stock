export interface NewsTopic {
  id: string;
  label: string;
  query: string;
}

export interface MarketIndicator {
  symbol: string;
  label: string;
  newsUrl: string;
  group: 'market' | 'sector';
  value: number | null;
  change: number | null;
  changePercent: number | null;
}

export interface EconomicCalendarLink {
  label: string;
  description: string;
  url: string;
}

export interface MarketNewsItem {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  topic: string;
  relatedTickers: string[];
  thumbnailUrl: string | null;
}

export interface MarketNewsResult {
  generatedAt: string;
  cache: {
    hit: boolean;
    ttlSeconds: number;
  };
  topics: NewsTopic[];
  indicators: MarketIndicator[];
  calendarLinks: EconomicCalendarLink[];
  items: MarketNewsItem[];
}
