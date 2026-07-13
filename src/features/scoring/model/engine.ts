/**
 * 스코어링 엔진.
 *
 * 입력: metrics — 기준 key -> 원시 값 또는 (custom 기준은) 이미 계산된 0~5 서브스코어.
 *   · 밴드 기준(per, pbr, roe, ...): 원시 지표 값.
 *   · custom 기준(moat, moving_average, valuation_band, ...): 0~5 서브스코어 직접 전달.
 *     수동 기준(moat/tam/governance/geopolitical/rates_fx)은 결측 시 중립 3점.
 *
 * 출력: 기준별 서브스코어, 영역별 점수, 종합 점수(0~100), 하드필터 결과.
 */
import {
  ALL_CRITERIA,
  CRITERIA_BY_KEY,
  AREAS,
  AREA_LABELS,
  criteriaInArea,
  scoreFromBands,
  type Area,
} from './criteria';
import { getPreset } from './presets';
import { applyFilters, defaultEnabled, type Metrics, type FilterFailure } from './filters';
import {
  interpretCriterion,
  areaInsight,
  overallSummary,
  type OverallSummary,
} from './interpret';

// 수동/컨텍스트 기준의 결측 기본값 (중립 3).
const NEUTRAL_DEFAULT = 3.0;
const NEUTRAL_STATUSES = new Set(['manual', 'context']);

export interface CriterionScore {
  number: number;
  key: string;
  nameKo: string;
  area: Area;
  status: string;
  raw: number | null; // 원시 지표 값 (custom 은 null)
  subscore: number | null; // 0~5 (결측이면 null)
  isDefault: boolean; // 중립 기본값이 적용됐는지
  interpretation: string; // 사람이 읽는 해석 한 줄
}

export interface AreaScore {
  area: Area;
  label: string;
  weight: number; // 프리셋 영역 가중치
  score: number | null; // 0~5 가중평균 (결측이면 null)
  insight: string; // 영역 강점/약점 한 줄
}

export interface ScoreResult {
  ticker: string;
  preset: string;
  composite: number | null; // 0~100
  areas: AreaScore[];
  criteria: CriterionScore[];
  passedFilter: boolean;
  filterFailures: FilterFailure[];
  summary: OverallSummary;
}

function subscoreFor(key: string, metrics: Metrics): { sub: number | null; isDefault: boolean } {
  const c = CRITERIA_BY_KEY[key];
  const value = metrics[key];
  if (value === null || value === undefined) {
    if (NEUTRAL_STATUSES.has(c.status)) {
      return { sub: NEUTRAL_DEFAULT, isDefault: true }; // 수동/컨텍스트 결측 → 중립
    }
    return { sub: null, isDefault: false }; // 자동/프록시 결측 → 제외
  }
  return { sub: scoreFromBands(value, c), isDefault: false };
}

export function scoreTicker(
  ticker: string,
  metrics: Metrics,
  presetKey?: string | null,
  filterKeys?: Set<string> | null,
): ScoreResult {
  const preset = getPreset(presetKey);
  const enabled = filterKeys ?? defaultEnabled();

  // 1) 기준별 서브스코어
  const critScores: CriterionScore[] = [];
  const subscoreMap: Record<string, number | null> = {};
  for (const c of ALL_CRITERIA) {
    const { sub, isDefault } = subscoreFor(c.key, metrics);
    subscoreMap[c.key] = sub;
    const rawVal = metrics[c.key];
    const raw = !c.custom && typeof rawVal === 'number' ? rawVal : null;
    critScores.push({
      number: c.number,
      key: c.key,
      nameKo: c.nameKo,
      area: c.area,
      status: c.status,
      raw,
      subscore: sub,
      isDefault,
      interpretation: interpretCriterion(c.key, raw, sub, isDefault),
    });
  }

  // 2) 영역별 가중평균
  const areaScores: AreaScore[] = [];
  const areaValue: Record<string, number | null> = {};
  for (const area of AREAS) {
    let numSum = 0.0;
    let den = 0.0;
    for (const c of criteriaInArea(area)) {
      const sub = subscoreMap[c.key];
      if (sub === null) continue;
      const w = preset.within[c.key] ?? 1.0;
      if (w <= 0) continue;
      numSum += sub * w;
      den += w;
    }
    const avg = den > 0 ? numSum / den : null;
    areaValue[area] = avg;
    areaScores.push({
      area,
      label: AREA_LABELS[area],
      weight: preset.areaWeights[area] ?? 0.0,
      score: avg,
      insight: areaInsight(area, critScores),
    });
  }

  // 3) 종합 (영역 결측 시 가중치 재정규화)
  let tnum = 0.0;
  let tden = 0.0;
  for (const area of AREAS) {
    const avg = areaValue[area];
    if (avg === null) continue;
    const aw = preset.areaWeights[area] ?? 0.0;
    tnum += avg * aw;
    tden += aw;
  }
  const composite = tden > 0 ? (tnum / tden) * 20 : null; // 0~5 → 0~100

  // 4) 하드 필터
  const { passed, failures } = applyFilters(metrics, enabled);

  const compositeRounded = composite !== null ? Math.round(composite * 10) / 10 : null;
  return {
    ticker,
    preset: preset.key,
    composite: compositeRounded,
    areas: areaScores,
    criteria: critScores,
    passedFilter: passed,
    filterFailures: failures,
    summary: overallSummary(compositeRounded, critScores, passed, failures),
  };
}
