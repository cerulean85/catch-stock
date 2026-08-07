export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** 평가 기준의 소제목 하나에 대한 결과. 기준을 고치면 항목도 따라 바뀐다. */
export interface RiskSection {
  title: string;
  level: RiskLevel;
  body: string;
}

/** 검색으로 참고한 출처. */
export interface RiskSource {
  title: string;
  uri: string;
}

export interface RiskAssessment {
  id: string;
  /** 평가한 시각. */
  createdAt: Date;
  level: RiskLevel;
  summary: string;
  sections: RiskSection[];
  /** 지금 확인해야 할 것. */
  watchlist: string[];
  sources: RiskSource[];
  /** 모델이 실제로 웹 검색을 했는지. 안 했다면 학습된 지식만으로 답한 것이다. */
  searched: boolean;
  model: string;
}

export type RiskResult = { data: RiskAssessment } | { error: string };
