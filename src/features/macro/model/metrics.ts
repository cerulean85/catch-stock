/**
 * 매크로 지표 카탈로그. 값은 성격별로 나눠 두고 여기서 합친다.
 * 합칠 때 MACRO_GROUPS(=PDF 문서 순서)로 다시 묶어 화면 순서를 맞춘다.
 */
import { ACTIVITY_METRICS } from './metrics-activity';
import { LIQUIDITY_METRICS } from './metrics-liquidity';
import { MANUAL_METRICS } from './metrics-manual';
import { MARKET_METRICS } from './metrics-market';
import { POLICY_METRICS } from './metrics-policy';
import { PRICE_METRICS } from './metrics-prices';
import { MACRO_GROUPS, type MacroMetric } from './types';

const ALL = [
  ...ACTIVITY_METRICS,
  ...PRICE_METRICS,
  ...POLICY_METRICS,
  ...LIQUIDITY_METRICS,
  ...MARKET_METRICS,
  ...MANUAL_METRICS,
];

export const MACRO_METRICS: MacroMetric[] = MACRO_GROUPS.flatMap((group) =>
  ALL.filter((metric) => metric.group === group.id),
);
