/**
 * 매크로 지표의 분류와 타입. 값은 metrics.ts, 파생 계산은 derived.ts에 있다.
 * 원문은 docs/metrics.pdf, 기준은 docs/spec/macro-metrics.md.
 */

/** PDF의 6분류. 배열 순서가 곧 문서 순서이자 화면 순서다. */
export type MacroGroupId =
  'real-economy' | 'policy' | 'liquidity' | 'bond' | 'trade-fx' | 'geopolitics';

export const MACRO_GROUPS: { id: MacroGroupId; label: string }[] = [
  { id: 'real-economy', label: '실물 경제' },
  { id: 'policy', label: '통화·재정 정책' },
  { id: 'liquidity', label: '시중 유동성' },
  { id: 'bond', label: '채권·금리 스프레드' },
  { id: 'trade-fx', label: '무역·환율' },
  { id: 'geopolitics', label: '지정학·산업' },
];

/**
 * 값을 어디서 받는지.
 * fred/treasury/nyfed/yahoo는 무료 API, manual은 API가 없어 사람이 확인한다.
 */
export type MacroSource = 'fred' | 'treasury' | 'nyfed' | 'yahoo' | 'manual';

/** 발표 주기. 값이 얼마나 묵었는지 표시하려면 필요하다. */
export type MacroFrequency = 'D' | 'W' | 'M' | 'Q';

/** 원계열을 화면에 올리기 전에 거치는 변환. */
export type MacroTransform = 'level' | 'yoy' | 'mom' | 'diff';

export interface MacroMetric {
  id: string;
  group: MacroGroupId;
  label: string;
  source: MacroSource;
  /** FRED 시리즈 ID·Yahoo 심볼·API 경로. manual 항목에는 없다. */
  seriesId?: string;
  /** manual 항목에서 값을 확인하러 가는 곳. */
  href?: string;
  transform: MacroTransform;
  frequency: MacroFrequency;
  unit: string;
  /** 이 값이 어떻게 움직이면 무슨 뜻인지. 대시보드 신호등의 근거가 된다. */
  watch: string;
  /** 톱니바퀴 — 같이 봐야 하는 지표 id. MACRO_DERIVED의 파생 지표도 가리킬 수 있다. */
  linkedTo: string[];
}

/** 파생 지표 — 개별 수치가 아니라 조합이 답을 주는 자리. 값은 derived.ts. */
export interface MacroDerived {
  id: string;
  label: string;
  formula: string;
  /** 계산에 필요한 카탈로그 지표. */
  inputs: string[];
  watch: string;
}
