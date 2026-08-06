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

export const JOURNAL_STATUSES = ['draft', 'published'] as const;
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

export const TITLE_MAX = 100;
export const TAG_MAX_COUNT = 15;

export interface Journal {
  id: string;
  userId: string;
  title: string;
  content: string;
  status: JournalStatus;
  tickers: string[];
  tags: string[];
  tradeTypes: TradeType[];
  riskChecks: RiskCheck[];
  tradeQty: string | null;
  tradePrice: string | null;
  sellPrice: string | null;
  tradeFee: string | null;
  sentiment: number | null;
  horizon: Horizon | null;
  targetReturn: string | null;
  actualReturn: string | null;
  linkedJournalId: string | null;
  reviewAt: Date | null;
  reviewedAt: Date | null;
  tradedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalInput {
  title: string;
  content: string;
  status: JournalStatus;
  tickers: string[];
  tags: string[];
  tradeTypes: TradeType[];
  riskChecks: RiskCheck[];
  tradeQty: number | null;
  tradePrice: number | null;
  sellPrice: number | null;
  tradeFee: number | null;
  sentiment: number | null;
  horizon: Horizon | null;
  targetReturn: number | null;
  actualReturn: number | null;
  linkedJournalId: string | null;
  reviewAt: Date | null;
  tradedAt: Date;
}

export const JOURNAL_SORTS = ['tradedAt', 'oldest', 'return', 'sentiment'] as const;
export type JournalSort = (typeof JOURNAL_SORTS)[number];
export const DEFAULT_SORT: JournalSort = 'tradedAt';
export const PAGE_SIZE = 12;

export const JOURNAL_VIEWS = ['grid', 'list', 'calendar'] as const;
export type JournalView = (typeof JOURNAL_VIEWS)[number];

export interface JournalFilters {
  q?: string;
  ticker?: string;
  tag?: string;
  tradeType?: TradeType;
  /** 미지정이면 초안·발행 모두 조회. */
  status?: JournalStatus;
  sort?: JournalSort;
  page?: number;
}

export interface JournalListResult {
  items: Journal[];
  total: number;
  page: number;
  pageCount: number;
}

export interface TickerStat {
  ticker: string;
  count: number;
  avgReturn: number | null;
  winRate: number | null;
}

export interface SentimentStat {
  sentiment: number;
  count: number;
  avgReturn: number | null;
}

export interface TradeTypeStat {
  tradeType: TradeType;
  count: number;
}

export interface RiskComplianceStat {
  withStopLoss: { count: number; avgReturn: number | null };
  withoutStopLoss: { count: number; avgReturn: number | null };
}

export interface MonthlyStat {
  month: string; // 'YYYY-MM'
  count: number;
  avgReturn: number | null;
}

export interface TradeHighlight {
  id: string;
  title: string;
  ticker: string;
  returnPct: number;
}

export interface JournalStats {
  total: number;
  withReturn: number;
  overallWinRate: number | null;
  overallAvgReturn: number | null;
  tickers: TickerStat[];
  sentiments: SentimentStat[];
  tradeTypes: TradeTypeStat[];
  riskCompliance: RiskComplianceStat;
  monthly: MonthlyStat[];
  best: TradeHighlight | null;
  worst: TradeHighlight | null;
}
