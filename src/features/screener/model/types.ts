export interface Sp500Ticker {
  symbol: string;
  name: string;
  sector: string;
}

export interface ScreenerItem {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  dailyRSI14: number;
  monthlyRSI14: number;
}

export interface SkippedTicker {
  symbol: string;
  reason: 'fetch_failed' | 'insufficient_daily' | 'insufficient_monthly' | 'insufficient_uptrend';
}

export interface ScreenerFilters {
  monthlyRSI14: { min: number };
  dailyRSI14Uptrend: { days: number };
}

export interface ScreenerResult {
  generatedAt: string;
  cache: { hit: boolean; ttlSeconds: number };
  filters: ScreenerFilters;
  items: ScreenerItem[];
  skipped: SkippedTicker[];
}

export const DEFAULT_FILTERS: ScreenerFilters = {
  monthlyRSI14: { min: 70 },
  dailyRSI14Uptrend: { days: 3 },
};
