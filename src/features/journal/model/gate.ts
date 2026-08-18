import { RISK_CHECKS, type JournalStatus, type RiskCheck, type TradeType } from './types';

/** 게이트를 거는 투자 유형. 실수는 실제 진입·청산에서 나오므로 분석·계획엔 걸지 않는다. */
export const GATED_TRADE_TYPES: TradeType[] = ['buy', 'sell'];

/**
 * 저장 직전에 확인시킬 미체크 항목.
 * 초안은 면제한다 — 아직 생각 중인 글까지 막으면 기록 자체를 안 하게 된다.
 */
export function missingRiskChecks(input: {
  status: JournalStatus;
  tradeTypes: TradeType[];
  riskChecks: RiskCheck[];
}): RiskCheck[] {
  if (input.status !== 'published') return [];
  if (!input.tradeTypes.some((type) => GATED_TRADE_TYPES.includes(type))) return [];
  return RISK_CHECKS.filter((check) => !input.riskChecks.includes(check));
}

/** 게이트를 띄워야 하는지. 하나라도 안 채웠으면 띄운다. */
export function needsGate(input: {
  status: JournalStatus;
  tradeTypes: TradeType[];
  riskChecks: RiskCheck[];
}): boolean {
  return missingRiskChecks(input).length > 0;
}
