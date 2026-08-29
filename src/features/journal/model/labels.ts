import type { Horizon, JournalCategory, RiskCheck, TradeType } from './types';

type T = (key: string) => string;

export function categoryLabel(value: JournalCategory, t: T): string {
  return t({ trade: 'categoryTrade', market: 'categoryMarket', study: 'categoryStudy' }[value]);
}

export function tradeTypeLabel(value: TradeType, t: T): string {
  return t(
    {
      buy: 'tradeTypeBuy',
      sell: 'tradeTypeSell',
      hold: 'tradeTypeHold',
      analysis: 'tradeTypeAnalysis',
      plan: 'tradeTypePlan',
      reflection: 'tradeTypeReflection',
    }[value],
  );
}

export function horizonLabel(value: Horizon, t: T): string {
  return t({ short: 'horizonShort', mid: 'horizonMid', long: 'horizonLong' }[value]);
}

export function sentimentLabel(value: number, t: T): string {
  const key = {
    1: 'sentimentVeryNegative',
    2: 'sentimentNegative',
    3: 'sentimentNeutral',
    4: 'sentimentPositive',
    5: 'sentimentVeryPositive',
  }[value];
  return key ? t(key) : String(value);
}

export function riskCheckLabel(value: RiskCheck, t: T): string {
  return t(
    {
      entryReason: 'riskEntryReason',
      stopLoss: 'riskStopLoss',
      positionSize: 'riskPositionSize',
      earningsDate: 'riskEarningsDate',
      marketDirection: 'riskMarketDirection',
      invalidation: 'riskInvalidation',
    }[value],
  );
}
