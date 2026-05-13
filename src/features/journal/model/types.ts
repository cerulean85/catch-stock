export const TRADE_TYPES = ['buy', 'sell', 'hold', 'analysis', 'plan', 'reflection'] as const;
export type TradeType = (typeof TRADE_TYPES)[number];

export const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  buy: '매수',
  sell: '매도',
  hold: '보유',
  analysis: '분석',
  plan: '계획',
  reflection: '반성',
};

export const HORIZONS = ['short', 'mid', 'long'] as const;
export type Horizon = (typeof HORIZONS)[number];

export const HORIZON_LABELS: Record<Horizon, string> = {
  short: '단기',
  mid: '중기',
  long: '장기',
};

export const SENTIMENT_LABELS: Record<number, string> = {
  1: '매우 부정',
  2: '부정',
  3: '보통',
  4: '긍정',
  5: '매우 긍정',
};

export const TITLE_MAX = 100;
export const TAG_MAX_COUNT = 15;

export interface Journal {
  id: string;
  userId: string;
  title: string;
  content: string;
  tickers: string[];
  tags: string[];
  tradeTypes: TradeType[];
  tradeQty: string | null;
  tradePrice: string | null;
  tradeFee: string | null;
  sentiment: number | null;
  horizon: Horizon | null;
  targetReturn: string | null;
  actualReturn: string | null;
  tradedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalInput {
  title: string;
  content: string;
  tickers: string[];
  tags: string[];
  tradeTypes: TradeType[];
  tradeQty: number | null;
  tradePrice: number | null;
  tradeFee: number | null;
  sentiment: number | null;
  horizon: Horizon | null;
  targetReturn: number | null;
  actualReturn: number | null;
  tradedAt: Date;
}

export interface JournalFilters {
  q?: string;
  ticker?: string;
  tag?: string;
  tradeType?: TradeType;
}
