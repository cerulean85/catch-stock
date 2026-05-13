export interface WatchlistNews {
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
}

export interface WatchlistJournal {
  id: string;
  title: string;
  tradedAt: string;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  dailyRSI14: number | null;
  monthlyRSI14: number | null;
  newsUrl: string;
  latestNews: WatchlistNews | null;
  lastJournalAt: string | null;
  recentJournals: WatchlistJournal[];
}

export interface WatchlistResult {
  generatedAt: string;
  authenticated: boolean;
  symbols: string[];
  items: WatchlistItem[];
}
