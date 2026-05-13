export type LiquidityMetricId = 'tga' | 'rrp' | 'reserves' | 'soma';

export interface LiquidityPoint {
  date: string;
  value: number;
}

export interface LiquidityMetric {
  id: LiquidityMetricId;
  name: string;
  label: string;
  description: string;
  source: string;
  frequency: string;
  impact: string;
  risingImpact: 'positive' | 'negative';
  latest: LiquidityPoint | null;
  previous: LiquidityPoint | null;
  points: LiquidityPoint[];
}

export interface LiquidityResult {
  generatedAt: string;
  cache: { hit: boolean; ttlSeconds: number };
  unit: 'billions_usd';
  metrics: LiquidityMetric[];
}

