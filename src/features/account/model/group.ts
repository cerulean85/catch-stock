import type { Holding, HoldingGroup } from './types';

/** DB의 numeric 컬럼은 문자열로 온다. */
export function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** 보유 종목 목록을 합계까지 붙인 그룹으로 만든다. 빈 목록이면 null. */
export function toGroup(holdings: Holding[], fallbackCurrency: string): HoldingGroup | null {
  if (holdings.length === 0) return null;
  const sum = (pick: (h: Holding) => number) => holdings.reduce((acc, h) => acc + pick(h), 0);
  const hasKrw = holdings.some((h) => h.evalAmountKrw != null);
  return {
    holdings,
    totalEval: sum((h) => h.evalAmount),
    totalPnl: sum((h) => h.pnlAmount),
    totalEvalKrw: hasKrw ? sum((h) => h.evalAmountKrw ?? 0) : null,
    currency: holdings[0]?.currency ?? fallbackCurrency,
  };
}
