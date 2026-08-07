/** 국내/해외 공통으로 다루는 보유 종목 1건. */
export interface Holding {
  scope: 'domestic' | 'overseas';
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
  /** 거래 통화 기준 합계. 해외는 원화 환산 합계를 따로 들고 있다. */
  totalEval: number;
  totalPnl: number;
  totalEvalKrw: number | null;
  currency: string;
}

/** 수집 서버(trade/)의 마지막 동기화 상태. 아직 한 번도 안 돌았으면 null. */
export interface SyncStatus {
  status: 'ok' | 'error';
  message: string | null;
  /** 수집 서버의 공인 IP. 키움에 등록해야 하는 값. */
  publicIp: string | null;
  syncedAt: Date;
}

export interface AccountBalance {
  domestic: HoldingGroup | null;
  overseas: HoldingGroup | null;
  sync: SyncStatus | null;
}
