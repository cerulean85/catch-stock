/**
 * 프리셋 — 영역 가중치 + 영역 내 개별 기준 가중치. SCORING.md §5 기준.
 *
 * 종합점수 = Σ_영역 [ 영역가중치 × (영역 내 가중평균 서브스코어) ] × 20   (0~100)
 *
 * within[key] 은 해당 기준의 영역 내 상대 가중치(합이 1일 필요는 없음; 엔진이 정규화).
 * 결측(null) 서브스코어는 가중평균에서 제외된다.
 */
import { AREA_FUNDAMENTAL, AREA_GROWTH, AREA_TECHNICAL, AREA_MACRO, type Area } from './criteria';

export interface Preset {
  key: string;
  nameKo: string;
  areaWeights: Partial<Record<Area, number>>; // area -> weight (합 1.0)
  within: Record<string, number>; // criterion key -> 영역 내 가중치
}

// 영역 내 기본(균형) 가중치 — 대부분 균등, 일부 조정.
const BALANCED_WITHIN: Record<string, number> = {
  // 영역 1
  per: 1.0,
  pbr: 1.0,
  roe: 1.2,
  ev_ebitda: 1.0,
  dividend_yield: 0.6,
  debt_to_equity: 1.0,
  retention: 0.5,
  // 영역 2
  growth_rate: 1.2,
  operating_margin: 1.0,
  moat: 0.8,
  tam: 0.6,
  governance: 0.6,
  // 영역 3
  moving_average: 1.0,
  volume: 0.8,
  institutional: 0.4,
  rsi_macd: 1.0,
  // 영역 4
  rates_fx: 0.6,
  geopolitical: 0.6,
  valuation_band: 1.2,
  risk_reward: 1.0,
};

export const BALANCED: Preset = {
  key: 'balanced',
  nameKo: '균형형',
  areaWeights: {
    [AREA_FUNDAMENTAL]: 0.3,
    [AREA_GROWTH]: 0.25,
    [AREA_TECHNICAL]: 0.2,
    [AREA_MACRO]: 0.25,
  },
  within: { ...BALANCED_WITHIN },
};

// 가치형: PER/PBR/배당/밸류밴드↑, 성장/모멘텀↓
export const VALUE: Preset = {
  key: 'value',
  nameKo: '가치형',
  areaWeights: {
    [AREA_FUNDAMENTAL]: 0.45,
    [AREA_GROWTH]: 0.15,
    [AREA_TECHNICAL]: 0.15,
    [AREA_MACRO]: 0.25,
  },
  within: {
    ...BALANCED_WITHIN,
    per: 1.4,
    pbr: 1.4,
    ev_ebitda: 1.2,
    dividend_yield: 1.2,
    roe: 1.0,
    retention: 0.4,
    growth_rate: 0.8,
    moat: 1.0,
    valuation_band: 1.5,
    risk_reward: 1.0,
  },
};

// 성장형: 성장률/영업이익률/해자/모멘텀↑, 배당/PBR≈0
export const GROWTH_PRESET: Preset = {
  key: 'growth',
  nameKo: '성장형',
  areaWeights: {
    [AREA_FUNDAMENTAL]: 0.15,
    [AREA_GROWTH]: 0.45,
    [AREA_TECHNICAL]: 0.25,
    [AREA_MACRO]: 0.15,
  },
  within: {
    ...BALANCED_WITHIN,
    pbr: 0.1,
    dividend_yield: 0.0,
    per: 0.5,
    retention: 1.0,
    growth_rate: 1.6,
    operating_margin: 1.3,
    moat: 1.2,
    tam: 1.0,
    moving_average: 1.2,
    rsi_macd: 1.2,
    volume: 1.0,
    valuation_band: 0.8,
  },
};

export const PRESETS: Record<string, Preset> = {
  [BALANCED.key]: BALANCED,
  [VALUE.key]: VALUE,
  [GROWTH_PRESET.key]: GROWTH_PRESET,
};

export const DEFAULT_PRESET = 'balanced';

export function getPreset(key: string | null | undefined): Preset {
  return PRESETS[key ?? DEFAULT_PRESET] ?? BALANCED;
}
