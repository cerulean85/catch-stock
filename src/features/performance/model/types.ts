/** 매수-매도가 짝지어져 청산이 끝난 매매 1건. */
export interface RoundTrip {
  scope: 'domestic' | 'overseas';
  code: string;
  name: string;
  currency: string;
  quantity: number;
  /** 이 물량의 매수 평균가. */
  buyPrice: number;
  /** 이 물량의 매도 평균가. */
  sellPrice: number;
  /** 배분된 수수료 합계 (매수분 + 매도분). */
  fee: number;
  /** 실현손익 = (매도가 − 매수가) × 수량 − 수수료 */
  pnl: number;
  /** 수익률 % = 실현손익 ÷ 매수원금 × 100 */
  returnPct: number;
  openedOn: string;
  closedOn: string;
  /** 보유기간(일). 같은 날 사고 팔면 0. */
  holdingDays: number;
  /** 이 종목으로 쓴 일지가 있었는지. */
  journaled: boolean;
}

/** 아직 안 팔고 들고 있는 물량. 성과 계산에서는 빼지만 수량은 알려준다. */
export interface OpenLot {
  scope: 'domestic' | 'overseas';
  code: string;
  name: string;
  quantity: number;
  openedOn: string;
}

export interface PerformanceStats {
  count: number;
  wins: number;
  losses: number;
  /** 이익으로 끝난 비율 %. 매매가 없으면 null. */
  winRate: number | null;
  /** 평균 이익 ÷ 평균 손실. 손실이 없으면 null(무한대 대신). */
  payoffRatio: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  avgHoldingDays: number | null;
  avgReturnPct: number | null;
  /** 통화별로 합산한 실현손익. 통화가 섞이면 더할 수 없어 나눠 담는다. */
  pnlByCurrency: { currency: string; pnl: number }[];
}

/** 일지를 남긴 매매와 그냥 지른 매매의 성과 비교. */
export interface JournalSplit {
  journaled: PerformanceStats;
  unjournaled: PerformanceStats;
}

export interface PerformanceReport {
  roundTrips: RoundTrip[];
  openLots: OpenLot[];
  overall: PerformanceStats;
  byScope: { scope: 'domestic' | 'overseas'; stats: PerformanceStats }[];
  byJournal: JournalSplit;
}
