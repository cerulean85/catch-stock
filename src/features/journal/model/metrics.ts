import type { Journal } from './types';

type Num = string | number | null | undefined;

function num(value: Num): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface TradeMetrics {
  /** 매수 총액 = 수량 × 단가 + 수수료 */
  totalCost: number | null;
  /** 실현 손익 금액 = (청산가 − 단가) × 수량 − 수수료 */
  pnlAmount: number | null;
  /** 실현 수익률 % = (청산가 − 단가) / 단가 × 100 */
  returnPct: number | null;
}

/**
 * 거래 정보(수량/단가/청산가/수수료)로부터 총액·손익·수익률을 결정론적으로 계산.
 * 청산가(sellPrice)가 없으면 손익/수익률은 null.
 */
export function computeTradeMetrics(input: {
  tradeQty?: Num;
  tradePrice?: Num;
  sellPrice?: Num;
  tradeFee?: Num;
}): TradeMetrics {
  const qty = num(input.tradeQty);
  const price = num(input.tradePrice);
  const sell = num(input.sellPrice);
  const fee = num(input.tradeFee) ?? 0;

  const totalCost = qty != null && price != null ? qty * price + fee : null;

  let returnPct: number | null = null;
  let pnlAmount: number | null = null;
  if (price != null && price !== 0 && sell != null) {
    returnPct = ((sell - price) / price) * 100;
    if (qty != null) {
      pnlAmount = (sell - price) * qty - fee;
    }
  }

  return { totalCost, pnlAmount, returnPct };
}

/**
 * 통계·필터에서 쓰는 "실질 수익률". 청산가 기반 계산값이 있으면 그것을,
 * 없으면 사용자가 수동 입력한 actualReturn을 사용.
 */
export function effectiveReturn(journal: Journal): number | null {
  const computed = computeTradeMetrics(journal).returnPct;
  if (computed != null) return computed;
  return num(journal.actualReturn);
}
