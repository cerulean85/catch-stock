/**
 * 20개 투자 기준 정의 — SCORING.md 의 밴드/방향/소스를 코드로 인코딩.
 *
 * 각 기준은 Criterion 으로 표현되며, 밴드(bands)는 [임계값, 점수] 목록이다.
 * 방향(direction):
 *   - higher: 값이 클수록 좋음. bands 는 내림차순 임계값. value >= threshold -> score.
 *   - lower:  값이 작을수록 좋음. bands 는 오름차순 임계값. value <= threshold -> score.
 * 어느 밴드에도 걸리지 않으면 0점. negativeZero=true 이면 음수는 무조건 0점
 * (PER, EV/EBITDA 처럼 적자/음수가 의미상 최악인 경우).
 */

export type Direction = 'higher' | 'lower';

export type Status =
  | 'auto' // ✅ 완전 자동
  | 'proxy' // 🟡 프록시/부분 자동
  | 'manual' // 🔴 수동 입력 (기본 중립 3)
  | 'context'; // 🟠 전 종목 공통 컨텍스트

// 4개 영역
export const AREA_FUNDAMENTAL = 'fundamental'; // 1. 기본적 분석 (가치·재무)
export const AREA_GROWTH = 'growth'; // 2. 성장성·비즈니스 모델
export const AREA_TECHNICAL = 'technical'; // 3. 기술적 분석·수급
export const AREA_MACRO = 'macro'; // 4. 매크로·리스크 관리

export type Area =
  | typeof AREA_FUNDAMENTAL
  | typeof AREA_GROWTH
  | typeof AREA_TECHNICAL
  | typeof AREA_MACRO;

export const AREAS: Area[] = [AREA_FUNDAMENTAL, AREA_GROWTH, AREA_TECHNICAL, AREA_MACRO];

export const AREA_LABELS: Record<Area, string> = {
  [AREA_FUNDAMENTAL]: '기본적 분석 (가치·재무)',
  [AREA_GROWTH]: '성장성·비즈니스 모델',
  [AREA_TECHNICAL]: '기술적 분석·수급',
  [AREA_MACRO]: '매크로·리스크 관리',
};

export interface Criterion {
  number: number; // 1~20
  key: string; // 기계용 식별자
  nameKo: string;
  area: Area;
  status: Status;
  // 밴드 기반 기준만 direction/bands 사용. 커스텀 계산 기준은 서브스코어를 직접 받는다.
  direction?: Direction;
  bands: ReadonlyArray<readonly [number, number]>; // [threshold, score]
  negativeZero: boolean;
  source: string; // 데이터 소스 필드/설명
  note: string;
  // 밴드로 표현 못 하는 기준(해자·거버넌스·손익비 등)은 custom=true.
  // 이 경우 엔진이 metric 값을 이미 0~5 서브스코어로 받은 것으로 간주한다.
  custom: boolean;
}

/** 밴드/커스텀 정의를 부분 필드만으로 만들 수 있게 하는 헬퍼. */
function crit(c: {
  number: number;
  key: string;
  nameKo: string;
  area: Area;
  status: Status;
  direction?: Direction;
  bands?: ReadonlyArray<readonly [number, number]>;
  negativeZero?: boolean;
  source?: string;
  note?: string;
  custom?: boolean;
}): Criterion {
  return {
    direction: c.direction,
    bands: c.bands ?? [],
    negativeZero: c.negativeZero ?? false,
    source: c.source ?? '',
    note: c.note ?? '',
    custom: c.custom ?? false,
    number: c.number,
    key: c.key,
    nameKo: c.nameKo,
    area: c.area,
    status: c.status,
  };
}

/** 밴드 테이블로 0~5 점수 산출. value 가 null 이면 null(결측) 반환. */
export function scoreFromBands(value: number | null, c: Criterion): number | null {
  if (value === null) return null;
  if (c.custom) {
    // custom 기준은 value 자체가 이미 0~5 서브스코어.
    return Math.max(0, Math.min(5, value));
  }
  if (c.negativeZero && value < 0) return 0;
  if (c.direction === 'higher') {
    for (const [threshold, sc] of c.bands) {
      // 내림차순
      if (value >= threshold) return sc;
    }
    return 0;
  }
  // lower
  for (const [threshold, sc] of c.bands) {
    // 오름차순
    if (value <= threshold) return sc;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// 영역 1 — 기본적 분석 (가치·재무) · 7개
// ---------------------------------------------------------------------------
const FUNDAMENTAL: Criterion[] = [
  crit({
    number: 1,
    key: 'per',
    nameKo: 'PER',
    area: AREA_FUNDAMENTAL,
    status: 'auto',
    direction: 'lower',
    bands: [
      [10, 5],
      [15, 4],
      [20, 3],
      [30, 2],
      [50, 1],
    ],
    negativeZero: true,
    source: 'peRatioTTM',
  }),
  crit({
    number: 2,
    key: 'pbr',
    nameKo: 'PBR',
    area: AREA_FUNDAMENTAL,
    status: 'auto',
    direction: 'lower',
    bands: [
      [1, 5],
      [1.5, 4],
      [3, 3],
      [5, 2],
      [8, 1],
    ],
    source: 'priceToBookRatioTTM',
  }),
  crit({
    number: 3,
    key: 'roe',
    nameKo: 'ROE',
    area: AREA_FUNDAMENTAL,
    status: 'auto',
    direction: 'higher',
    bands: [
      [0.2, 5],
      [0.15, 4],
      [0.1, 3],
      [0.05, 2],
      [0.0, 1],
    ],
    source: 'returnOnEquityTTM',
    note: '비율(0.20 = 20%)',
  }),
  crit({
    number: 4,
    key: 'ev_ebitda',
    nameKo: 'EV/EBITDA',
    area: AREA_FUNDAMENTAL,
    status: 'auto',
    direction: 'lower',
    bands: [
      [6, 5],
      [8, 4],
      [11, 3],
      [15, 2],
      [20, 1],
    ],
    negativeZero: true,
    source: 'enterpriseValueOverEBITDATTM',
  }),
  crit({
    number: 5,
    key: 'dividend_yield',
    nameKo: '배당수익률',
    area: AREA_FUNDAMENTAL,
    status: 'auto',
    direction: 'higher',
    bands: [
      [0.03, 5],
      [0.02, 4],
      [0.01, 3],
      [0.005, 2],
      [0.0001, 1],
    ],
    source: 'dividendYieldTTM',
    note: '성장형 가중치≈0',
  }),
  crit({
    number: 6,
    key: 'debt_to_equity',
    nameKo: '부채비율(D/E)',
    area: AREA_FUNDAMENTAL,
    status: 'auto',
    direction: 'lower',
    bands: [
      [0.5, 5],
      [1.0, 4],
      [1.5, 3],
      [2.0, 2],
      [3.0, 1],
    ],
    source: 'debtToEquityTTM',
    note: '배수(0.5 = 50%)',
  }),
  crit({
    number: 7,
    key: 'retention',
    nameKo: '유보율',
    area: AREA_FUNDAMENTAL,
    status: 'auto',
    direction: 'higher',
    bands: [
      [0.8, 5],
      [0.6, 4],
      [0.4, 3],
      [0.2, 2],
      [0.0, 1],
    ],
    source: '1 - payoutRatioTTM',
    note: '재투자 성향 프록시, 가중치 낮음',
  }),
];

// ---------------------------------------------------------------------------
// 영역 2 — 성장성·비즈니스 모델 · 5개
// ---------------------------------------------------------------------------
const GROWTH: Criterion[] = [
  crit({
    number: 8,
    key: 'growth_rate',
    nameKo: '매출/영업이익 성장률',
    area: AREA_GROWTH,
    status: 'auto',
    direction: 'higher',
    bands: [
      [0.2, 5],
      [0.15, 4],
      [0.1, 3],
      [0.05, 2],
      [0.0, 1],
    ],
    source: 'revenueGrowth·epsgrowth 평균',
  }),
  crit({
    number: 9,
    key: 'operating_margin',
    nameKo: '영업이익률',
    area: AREA_GROWTH,
    status: 'auto',
    direction: 'higher',
    bands: [
      [0.25, 5],
      [0.2, 4],
      [0.15, 3],
      [0.1, 2],
      [0.05, 1],
    ],
    source: 'operatingProfitMarginTTM',
  }),
  crit({
    number: 10,
    key: 'moat',
    nameKo: '경제적 해자',
    area: AREA_GROWTH,
    status: 'manual',
    custom: true,
    source: '수동 입력 (프록시 참고: 5yr ROIC + 마진 안정성)',
    note: '기본 중립 3, 사용자 오버레이',
  }),
  crit({
    number: 11,
    key: 'tam',
    nameKo: 'TAM',
    area: AREA_GROWTH,
    status: 'manual',
    custom: true,
    source: '수동 입력 (섹터 성장률 참고)',
    note: '기본 중립 3',
  }),
  crit({
    number: 12,
    key: 'governance',
    nameKo: '경영진·거버넌스',
    area: AREA_GROWTH,
    status: 'manual',
    custom: true,
    source: '수동 입력 (참고: 자사주 감소·내부자 지분)',
    note: '기본 중립 3',
  }),
];

// ---------------------------------------------------------------------------
// 영역 3 — 기술적 분석·수급 · 4개 (가격 히스토리 계산 → 이미 0~5 서브스코어)
// ---------------------------------------------------------------------------
const TECHNICAL: Criterion[] = [
  crit({
    number: 13,
    key: 'moving_average',
    nameKo: '이동평균선',
    area: AREA_TECHNICAL,
    status: 'auto',
    custom: true,
    source: '20/60/120일 MA 정배열 계산',
  }),
  crit({
    number: 14,
    key: 'volume',
    nameKo: '거래량',
    area: AREA_TECHNICAL,
    status: 'auto',
    custom: true,
    source: '20일 평균 대비 상승/하락일 거래량',
  }),
  crit({
    number: 15,
    key: 'institutional',
    nameKo: '기관 수급',
    area: AREA_TECHNICAL,
    status: 'proxy',
    custom: true,
    source: 'institutionalOwnership 분기 변화',
    note: '후행지표(13F), 가중치 최소. 결측 시 제외',
  }),
  crit({
    number: 16,
    key: 'rsi_macd',
    nameKo: 'RSI/MACD',
    area: AREA_TECHNICAL,
    status: 'auto',
    custom: true,
    source: '14일 RSI + MACD(12,26,9)',
  }),
];

// ---------------------------------------------------------------------------
// 영역 4 — 매크로·리스크 관리 · 4개
// ---------------------------------------------------------------------------
const MACRO: Criterion[] = [
  crit({
    number: 17,
    key: 'rates_fx',
    nameKo: '금리·환율',
    area: AREA_MACRO,
    status: 'context',
    custom: true,
    source: 'FRED 시장 레짐(10Y·곡선·달러)',
    note: '개별 차별화 아님. FRED 매크로로 전 종목 공통 산출, 시장 배너로 표시(키 없으면 중립 3)',
  }),
  crit({
    number: 18,
    key: 'geopolitical',
    nameKo: '지정학·규제',
    area: AREA_MACRO,
    status: 'manual',
    custom: true,
    source: '수동 오버레이 태그',
    note: '기본 중립 3',
  }),
  crit({
    number: 19,
    key: 'valuation_band',
    nameKo: '밸류에이션 밴드',
    area: AREA_MACRO,
    status: 'auto',
    custom: true,
    source: '자기 PER/PBR 5년 백분위',
    note: '≤20%ile=5 … ≥80%ile=0 (엔진이 서브스코어로 환산)',
  }),
  crit({
    number: 20,
    key: 'risk_reward',
    nameKo: '손익비',
    area: AREA_MACRO,
    status: 'proxy',
    custom: true,
    source: '(목표가−현재가)/(현재가−손절)',
    note: '손절=P−2·ATR, 목표=애널리스트 평균 or 최근 고점',
  }),
];

export const ALL_CRITERIA: Criterion[] = [...FUNDAMENTAL, ...GROWTH, ...TECHNICAL, ...MACRO];

export const CRITERIA_BY_KEY: Record<string, Criterion> = Object.fromEntries(
  ALL_CRITERIA.map((c) => [c.key, c]),
);

export const CRITERIA_BY_NUMBER: Record<number, Criterion> = Object.fromEntries(
  ALL_CRITERIA.map((c) => [c.number, c]),
);

export function criteriaInArea(area: Area): Criterion[] {
  return ALL_CRITERIA.filter((c) => c.area === area);
}
