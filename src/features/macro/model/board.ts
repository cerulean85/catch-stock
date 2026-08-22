/** 대시보드가 화면에 넘기는 자료 모양. 계산은 compute.ts·regime.ts에서 끝낸다. */
import type { RegimeReading } from './regime';
import type { MacroDerived, MacroMetric } from './types';

export interface MacroReading {
  metric: MacroMetric;
  /** transform까지 적용한 현재 값. 못 받았거나 수동 항목이면 null. */
  value: number | null;
  /** 직전 관측 대비 변화. 같은 단위다. */
  change: number | null;
  /** 값의 기준일(YYYY-MM-DD). */
  asOf: string | null;
  /** 스파크라인용. 오래된 것 → 최신 순서. */
  history: number[];
  /** 계산 근거나 부연. 발행 비중의 집계 구간 같은 것. */
  note?: string;
  /** 못 받았을 때 이유. 화면에서 조용히 넘기지 않고 이유를 보여준다. */
  error?: string;
}

export interface MacroDerivedReading {
  derived: MacroDerived;
  value: number | null;
  unit: string;
  /** 어떤 값으로 어떻게 나왔는지 한 줄. */
  detail: string;
}

export interface MacroBoard {
  readings: MacroReading[];
  derived: MacroDerivedReading[];
  regime: RegimeReading | null;
  fetchedAt: string;
}
