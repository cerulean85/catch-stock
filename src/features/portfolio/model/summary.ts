import type { AccountBalance, Holding } from '@/features/account';

/** 한 종목이 포트폴리오에서 차지하는 비중. */
export interface Weight {
  code: string;
  name: string;
  scope: 'domestic' | 'overseas';
  /** 원화 환산 평가금액. */
  valueKrw: number;
  /** 총 평가액 대비 비중 %. */
  weightPct: number;
  pnlAmount: number;
  pnlRate: number;
  currency: string;
}

export type WarningKey =
  | 'portfolioWarnSingle'
  | 'portfolioWarnTop3'
  | 'portfolioWarnCurrency'
  | 'portfolioWarnLosers';

export interface Warning {
  key: WarningKey;
  /** 경고를 띄운 실제 수치 %. */
  value: number;
  /** 종목명 등 덧붙일 말. */
  detail?: string;
}

export interface Exposure {
  label: string;
  valueKrw: number;
  weightPct: number;
}

export interface PortfolioSummary {
  /** 원화로 환산해 합칠 수 있었던 총 평가액. */
  totalKrw: number;
  totalPnlKrw: number;
  weights: Weight[];
  byScope: Exposure[];
  byCurrency: Exposure[];
  /** 평가액 기준 수익 종목 비중 %. */
  winnerWeightPct: number;
  loserWeightPct: number;
  warnings: Warning[];
  /** 원화 환산값이 없어 합계에서 빠진 종목. 비어 있어야 정상이다. */
  unconvertible: string[];
}

/** 한 종목이 이 비중을 넘으면 집중 리스크로 본다. */
export const SINGLE_LIMIT_PCT = 30;
/**
 * 상위 3종목 합계 한도. 5종목을 똑같이 나눠 담아도 60%가 되므로,
 * 고르게 분산한 경우를 쏠림으로 오인하지 않도록 70%로 두고 5종목 이상일 때만 본다.
 */
export const TOP3_LIMIT_PCT = 70;
export const TOP3_MIN_HOLDINGS = 5;
/** 한 통화에 이 이상 쏠리면 환율 리스크를 알린다. */
export const CURRENCY_LIMIT_PCT = 90;
/** 물려 있는 종목이 이 이상이면 알린다. */
export const LOSER_LIMIT_PCT = 60;

/** 국내는 원화 그대로, 해외는 환산값을 쓴다. 환산값이 없으면 합칠 수 없다. */
function valueKrw(holding: Holding): number | null {
  if (holding.scope === 'domestic') return holding.evalAmount;
  return holding.evalAmountKrw;
}

function pnlKrw(holding: Holding, converted: number): number {
  if (holding.scope === 'domestic') return holding.pnlAmount;
  // 해외는 손익도 같은 환율로 환산한다. 평가액 대비 비율로 되돌려 계산.
  if (holding.evalAmount === 0) return 0;
  return (holding.pnlAmount / holding.evalAmount) * converted;
}

function exposures(
  rows: { label: string; valueKrw: number }[],
  total: number,
): Exposure[] {
  const sums = new Map<string, number>();
  for (const row of rows) sums.set(row.label, (sums.get(row.label) ?? 0) + row.valueKrw);
  return [...sums.entries()]
    .map(([label, value]) => ({
      label,
      valueKrw: value,
      weightPct: total === 0 ? 0 : (value / total) * 100,
    }))
    .sort((a, b) => b.valueKrw - a.valueKrw);
}

/**
 * 보유 종목을 합쳐 "내 돈이 어디에 얼마나 쏠려 있나"를 낸다.
 * 개별 종목이 아니라 전체 구성에서 오는 리스크를 보기 위한 것이다.
 */
export function summarize(balance: AccountBalance): PortfolioSummary {
  const holdings = [
    ...(balance.domestic?.holdings ?? []),
    ...(balance.overseas?.holdings ?? []),
  ];

  const unconvertible: string[] = [];
  const converted: { holding: Holding; valueKrw: number; pnlKrw: number }[] = [];
  for (const holding of holdings) {
    const value = valueKrw(holding);
    if (value == null) {
      unconvertible.push(holding.name || holding.code);
      continue;
    }
    converted.push({ holding, valueKrw: value, pnlKrw: pnlKrw(holding, value) });
  }

  const totalKrw = converted.reduce((sum, row) => sum + row.valueKrw, 0);
  const totalPnlKrw = converted.reduce((sum, row) => sum + row.pnlKrw, 0);

  const weights: Weight[] = converted
    .map(({ holding, valueKrw: value }) => ({
      code: holding.code,
      name: holding.name,
      scope: holding.scope,
      valueKrw: value,
      weightPct: totalKrw === 0 ? 0 : (value / totalKrw) * 100,
      pnlAmount: holding.pnlAmount,
      pnlRate: holding.pnlRate,
      currency: holding.currency,
    }))
    .sort((a, b) => b.valueKrw - a.valueKrw);

  const byScope = exposures(
    converted.map(({ holding, valueKrw: value }) => ({ label: holding.scope, valueKrw: value })),
    totalKrw,
  );
  const byCurrency = exposures(
    converted.map(({ holding, valueKrw: value }) => ({ label: holding.currency, valueKrw: value })),
    totalKrw,
  );

  const winnerWeightPct = weights
    .filter((w) => w.pnlAmount > 0)
    .reduce((sum, w) => sum + w.weightPct, 0);
  const loserWeightPct = weights
    .filter((w) => w.pnlAmount < 0)
    .reduce((sum, w) => sum + w.weightPct, 0);

  const warnings: Warning[] = [];
  const top = weights[0];
  if (top && top.weightPct >= SINGLE_LIMIT_PCT) {
    warnings.push({
      key: 'portfolioWarnSingle',
      value: top.weightPct,
      detail: top.name || top.code,
    });
  }
  const top3 = weights.slice(0, 3).reduce((sum, w) => sum + w.weightPct, 0);
  if (weights.length >= TOP3_MIN_HOLDINGS && top3 >= TOP3_LIMIT_PCT) {
    warnings.push({ key: 'portfolioWarnTop3', value: top3 });
  }
  const topCurrency = byCurrency[0];
  if (byCurrency.length > 1 && topCurrency && topCurrency.weightPct >= CURRENCY_LIMIT_PCT) {
    warnings.push({
      key: 'portfolioWarnCurrency',
      value: topCurrency.weightPct,
      detail: topCurrency.label,
    });
  }
  if (loserWeightPct >= LOSER_LIMIT_PCT) {
    warnings.push({ key: 'portfolioWarnLosers', value: loserWeightPct });
  }

  return {
    totalKrw,
    totalPnlKrw,
    weights,
    byScope,
    byCurrency,
    winnerWeightPct,
    loserWeightPct,
    warnings,
    unconvertible,
  };
}
