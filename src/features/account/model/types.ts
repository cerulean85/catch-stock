/** 국내/해외 공통으로 다루는 보유 종목 1건. */
export interface Holding {
  code: string;
  name: string;
  quantity: number;
  /** 매입 평균단가 (거래 통화 기준) */
  avgPrice: number;
  /** 현재가 (거래 통화 기준) */
  currentPrice: number;
  /** 평가금액 (거래 통화 기준) */
  evalAmount: number;
  /** 평가손익 (거래 통화 기준) */
  pnlAmount: number;
  /** 평가손익률 % */
  pnlRate: number;
  currency: string;
  /** 해외 종목의 원화 환산 평가금액. 국내는 null. */
  evalAmountKrw: number | null;
}

export interface HoldingGroup {
  holdings: Holding[];
  /** 거래 통화 기준 합계. 통화가 섞이면 원화 환산액이 있는 해외는 evalAmountKrw로 따로 본다. */
  totalEval: number;
  totalPnl: number;
  totalEvalKrw: number | null;
  currency: string;
}

export interface AccountBalance {
  domestic: HoldingGroup | null;
  overseas: HoldingGroup | null;
  /** 조회 실패한 구간의 사유. 한쪽만 실패해도 다른 쪽은 그대로 보여준다. */
  errors: { scope: 'domestic' | 'overseas'; message: string }[];
  fetchedAt: Date;
}
