/**
 * 하드 필터 — 스크리닝 기본 세트. SCORING.md §6.
 *
 * 각 필터는 metrics(원시 지표 dict)를 받아 통과/탈락(boolean)과 사유를 돌려준다.
 * 값이 결측이면 해당 필터는 통과로 간주(데이터 부족으로 배제하지 않음).
 */

export type Metrics = Record<string, number | null | undefined>;

export interface FilterFailure {
  key: string;
  name: string;
  reason: string;
}

export interface HardFilter {
  key: string;
  nameKo: string;
  defaultOn: boolean;
  // true=통과, false=탈락, null=판단불가(통과 처리)
  test: (m: Metrics) => boolean | null;
  reason: string;
}

function num(m: Metrics, k: string): number | null {
  const v = m[k];
  return typeof v === 'number' ? v : null;
}

export const DEFAULT_FILTERS: HardFilter[] = [
  {
    key: 'profitable',
    nameKo: '흑자 필터',
    defaultOn: true,
    test: (m) => {
      const roe = num(m, 'roe');
      const om = num(m, 'operating_margin');
      if (roe === null && om === null) return null;
      return (roe ?? 0) > 0 && (om ?? 0) > 0;
    },
    reason: 'ROE > 0 이고 영업이익률 > 0',
  },
  {
    key: 'solvency',
    nameKo: '재무 안정',
    defaultOn: true,
    test: (m) => {
      const de = num(m, 'debt_to_equity');
      return de === null ? null : de < 3.0;
    },
    reason: '부채비율(D/E) < 3',
  },
  {
    key: 'uptrend',
    nameKo: '추세 필터',
    defaultOn: true,
    test: (m) => {
      const price = num(m, 'price');
      const ma120 = num(m, 'ma120');
      if (price === null || ma120 === null) return null;
      return price > ma120;
    },
    reason: '현재가 > MA120 (하락추세 제외)',
  },
  {
    key: 'not_overvalued',
    nameKo: '밸류 필터',
    defaultOn: true,
    test: (m) => {
      const pct = num(m, 'valuation_percentile');
      return pct === null ? null : pct < 80;
    },
    reason: '밸류에이션 밴드 백분위 < 80',
  },
  {
    key: 'dividend',
    nameKo: '배당 필터',
    defaultOn: false, // 배당 전략일 때만
    test: (m) => {
      const dy = num(m, 'dividend_yield');
      return dy === null ? null : dy > 0;
    },
    reason: '배당수익률 > 0',
  },
];

export const FILTERS_BY_KEY: Record<string, HardFilter> = Object.fromEntries(
  DEFAULT_FILTERS.map((f) => [f.key, f]),
);

/** 활성 필터를 적용. 반환: { passed, failures }. */
export function applyFilters(
  metrics: Metrics,
  enabledKeys: Set<string>,
): { passed: boolean; failures: FilterFailure[] } {
  const failures: FilterFailure[] = [];
  for (const f of DEFAULT_FILTERS) {
    if (!enabledKeys.has(f.key)) continue;
    if (f.test(metrics) === false) {
      failures.push({ key: f.key, name: f.nameKo, reason: f.reason });
    }
  }
  return { passed: failures.length === 0, failures };
}

export function defaultEnabled(): Set<string> {
  return new Set(DEFAULT_FILTERS.filter((f) => f.defaultOn).map((f) => f.key));
}
