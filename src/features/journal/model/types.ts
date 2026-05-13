export const TRADE_TYPES = ['buy', 'sell', 'hold', 'analysis', 'plan', 'reflection'] as const;
export type TradeType = (typeof TRADE_TYPES)[number];

export const HORIZONS = ['short', 'mid', 'long'] as const;
export type Horizon = (typeof HORIZONS)[number];

export const RISK_CHECKS = [
  'entryReason',
  'stopLoss',
  'positionSize',
  'earningsDate',
  'marketDirection',
  'invalidation',
] as const;
export type RiskCheck = (typeof RISK_CHECKS)[number];

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
  riskChecks: RiskCheck[];
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
  riskChecks: RiskCheck[];
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
