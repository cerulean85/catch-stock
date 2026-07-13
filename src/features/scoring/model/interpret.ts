/**
 * 지표 해석 생성 — 수치를 '그래서 무슨 의미인지' 한국어 문구로 환산.
 *
 * 밴드/서브스코어에서 결정론적으로 생성(LLM 없음). 3층으로 구성:
 *   · interpretCriterion : 기준별 한 줄 해석 (구간 판정 + 근거 임계값 + 주의점)
 *   · areaInsight        : 영역별 강점/약점 드라이버 1줄
 *   · overallSummary     : 종합 헤드라인 + 강점 Top3 · 리스크 Top3
 */
import { CRITERIA_BY_KEY, type Criterion, type Area } from './criteria';
import type { FilterFailure } from './filters';

const PERCENT_KEYS = new Set([
  'roe',
  'dividend_yield',
  'retention',
  'growth_rate',
  'operating_margin',
]);

function fmtRaw(key: string, v: number | null): string {
  if (v === null) return '—';
  if (PERCENT_KEYS.has(key)) return `${(v * 100).toFixed(1)}%`;
  if (key === 'debt_to_equity') return `${(v * 100).toFixed(0)}%`;
  if (key === 'per' || key === 'pbr' || key === 'ev_ebitda') return `${v.toFixed(1)}배`;
  return v.toFixed(2);
}

// 방향별 서브스코어(반올림) → 판정어
const VERDICT_LOWER: Record<number, string> = {
  5: '매우 우수',
  4: '우수',
  3: '적정',
  2: '다소 부담',
  1: '고평가·과중',
  0: '고평가·위험',
};
const VERDICT_HIGHER: Record<number, string> = {
  5: '최상위',
  4: '우수',
  3: '양호',
  2: '다소 미흡',
  1: '부진',
  0: '매우 부진',
};

// 커스텀(기술·수급·밸류밴드·손익비·정성) 서브스코어 → 문구
const CUSTOM_PHRASES: Record<string, Record<number, string>> = {
  moving_average: {
    5: '완전 정배열 — 강세 추세',
    4: '정배열 우위',
    3: '혼조 구간',
    2: '약세 우위',
    1: '역배열 — 하락 추세',
    0: '역배열 — 뚜렷한 하락 추세',
  },
  volume: {
    5: '강한 매집 — 상승일 거래량 우세',
    4: '매집 우위',
    3: '중립적 수급',
    2: '분산 우위',
    1: '분산 — 하락일 거래량 우세',
    0: '뚜렷한 분산',
  },
  rsi_macd: {
    5: '모멘텀 양호 — 과매수 아님',
    4: '모멘텀 우호',
    3: '중립 모멘텀',
    2: '모멘텀 둔화',
    1: '모멘텀 약화 / 과열·과매도',
    0: '모멘텀 악화',
  },
  institutional: {
    5: '기관 순매수 뚜렷',
    4: '기관 매수 우위',
    3: '기관 수급 중립',
    2: '기관 매도 우위',
    1: '기관 순매도',
    0: '기관 순매도 뚜렷',
  },
  valuation_band: {
    5: '자체 5년 밴드 하단 — 저평가',
    4: '밴드 하위권',
    3: '밴드 중단',
    2: '밴드 상위권',
    1: '밴드 상단 — 고평가',
    0: '밴드 최상단 — 고평가',
  },
  risk_reward: {
    5: '손익비 우수 — 상방 여력 큼',
    4: '손익비 양호',
    3: '손익비 중립',
    2: '손익비 미흡',
    1: '손익비 불리 — 하방 부담',
    0: '손익비 매우 불리',
  },
  moat: { 5: '강력한 해자', 4: '해자 우위', 3: '해자 보통', 2: '해자 약함', 1: '해자 취약', 0: '해자 없음' },
  tam: {
    5: '시장 기회 매우 큼',
    4: '시장 기회 큼',
    3: '시장 기회 보통',
    2: '시장 성숙',
    1: '시장 정체',
    0: '시장 축소',
  },
  governance: {
    5: '거버넌스 우수',
    4: '거버넌스 양호',
    3: '거버넌스 보통',
    2: '거버넌스 우려',
    1: '거버넌스 취약',
    0: '거버넌스 위험',
  },
  geopolitical: {
    5: '지정학 리스크 낮음',
    4: '리스크 제한적',
    3: '리스크 보통',
    2: '리스크 상존',
    1: '리스크 높음',
    0: '리스크 심각',
  },
  rates_fx: {
    5: '금리·환율 레짐 우호',
    4: '레짐 우호',
    3: '레짐 중립',
    2: '레짐 주의',
    1: '레짐 부정적',
    0: '레짐 매우 부정적',
  },
};

// 특정 기준에서 극단값일 때 덧붙이는 주의점
const CAVEATS: Record<
  string,
  { when: (raw: number | null, sub: number) => boolean; text: string }
> = {
  roe: {
    when: (raw) => raw !== null && raw > 0.5,
    text: '자사주 매입 등으로 자본이 작아져 과대 계상됐을 수 있음',
  },
  per: { when: (_raw, sub) => sub === 0, text: '적자이거나 이익 대비 지나치게 비쌈' },
  ev_ebitda: { when: (_raw, sub) => sub === 0, text: 'EBITDA 적자이거나 극단적 고평가' },
  dividend_yield: {
    when: (raw) => raw !== null && raw > 0.06,
    text: '고배당은 주가 급락·감배 위험 동반 가능',
  },
  debt_to_equity: {
    when: (_raw, sub) => sub <= 1,
    text: '레버리지 과중 — 금리 상승기 이자부담 주의',
  },
};

/** target 점(기본 3=적정/양호)을 받는 경계 임계값. */
function bandRef(c: Criterion, target = 3): number | null {
  for (const [t, s] of c.bands) {
    if (s === target) return t;
  }
  return null;
}

/** 기준 1개에 대한 한 줄 해석. */
export function interpretCriterion(
  key: string,
  raw: number | null,
  subscore: number | null,
  isDefault: boolean,
): string {
  const c = CRITERIA_BY_KEY[key];
  if (!c) return '';
  if (subscore === null) return '데이터 없음 — 점수 산정에서 제외';
  if (isDefault) return '입력값 없음 — 중립(3) 기본값 적용, 직접 평가 권장';

  const lvl = Math.round(subscore);

  // 커스텀(서브스코어만 있는) 기준
  if (c.custom) {
    const phrase = CUSTOM_PHRASES[key]?.[lvl];
    return phrase || `서브스코어 ${subscore.toFixed(1)}/5`;
  }

  // 밴드 기준: 판정어 + 근거 임계값 + 주의점
  const table = c.direction === 'lower' ? VERDICT_LOWER : VERDICT_HIGHER;
  const verdict = table[lvl] ?? '';
  const ref = bandRef(c, 3);
  const parts = [`${fmtRaw(key, raw)} — ${verdict}`];
  if (ref !== null) {
    const cmp = c.direction === 'lower' ? '이하' : '이상';
    parts.push(`(적정 기준 ${fmtRaw(key, ref)} ${cmp})`);
  }
  let text = parts.join(' ');

  const cav = CAVEATS[key];
  if (cav && cav.when(raw, lvl)) {
    text += ` · ⚠ ${cav.text}`;
  }
  return text;
}

// CriterionScore 의 최소 형태 (engine 이 넘겨줌)
export interface CritScoreLike {
  key: string;
  nameKo: string;
  area: Area;
  subscore: number | null;
  isDefault: boolean;
}

/** 영역 내 강점/약점 드라이버 1줄. */
export function areaInsight(area: Area, critScores: CritScoreLike[]): string {
  const scored = critScores.filter(
    (c) => c.area === area && c.subscore !== null && !c.isDefault,
  );
  if (scored.length === 0) return '평가 가능한 지표가 부족합니다.';
  const best = scored.reduce((a, b) => ((b.subscore ?? 0) > (a.subscore ?? 0) ? b : a));
  const worst = scored.reduce((a, b) => ((b.subscore ?? 0) < (a.subscore ?? 0) ? b : a));
  const bestS = best.subscore ?? 0;
  const worstS = worst.subscore ?? 0;
  if (best.key === worst.key) return `${best.nameKo} ${bestS.toFixed(1)}/5 단일 지표 기준.`;
  if (worstS >= 3.5) return `전반적 강세 — ${best.nameKo}(${bestS.toFixed(1)}) 주도, 뚜렷한 약점 없음.`;
  if (bestS <= 2.5) return `전반적 약세 — ${worst.nameKo}(${worstS.toFixed(1)}) 특히 부진.`;
  return `강점 ${best.nameKo}(${bestS.toFixed(1)}) · 약점 ${worst.nameKo}(${worstS.toFixed(1)}).`;
}

const COMPOSITE_HEADLINE: ReadonlyArray<readonly [number, string]> = [
  [75, '종합 매우 우수 — 대부분 기준을 충족'],
  [60, '종합 양호 — 강점이 약점을 상회'],
  [45, '종합 보통 — 강·약점이 혼재'],
  [30, '종합 미흡 — 약점 비중이 큼'],
  [0, '종합 부진 — 대부분 기준 미달'],
];

export interface OverallSummary {
  headline: string;
  strengths: string[];
  risks: string[];
}

/** 종합 헤드라인 + 강점/리스크 Top3. */
export function overallSummary(
  composite: number | null,
  critScores: CritScoreLike[],
  passedFilter: boolean,
  filterFailures: FilterFailure[],
): OverallSummary {
  const scored = critScores.filter((c) => c.subscore !== null && !c.isDefault);
  const strengths = scored
    .filter((c) => (c.subscore ?? 0) >= 3.5)
    .sort((a, b) => (b.subscore ?? 0) - (a.subscore ?? 0))
    .slice(0, 3);
  const risks = scored
    .filter((c) => (c.subscore ?? 0) <= 2.0)
    .sort((a, b) => (a.subscore ?? 0) - (b.subscore ?? 0))
    .slice(0, 3);

  let headline: string;
  if (composite === null) {
    headline = '데이터 부족 — 종합 판단 보류';
  } else {
    headline = COMPOSITE_HEADLINE.find(([lo]) => composite >= lo)?.[1] ?? '';
  }
  if (!passedFilter && filterFailures.length > 0) {
    headline += ` · 하드필터 탈락(${filterFailures.map((f) => f.name).join(', ')})`;
  }

  return {
    headline,
    strengths: strengths.map((c) => `${c.nameKo} ${(c.subscore ?? 0).toFixed(1)}`),
    risks: risks.map((c) => `${c.nameKo} ${(c.subscore ?? 0).toFixed(1)}`),
  };
}
