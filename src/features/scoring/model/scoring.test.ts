import { describe, it, expect } from 'vitest';
import { scoreFromBands, CRITERIA_BY_KEY } from './criteria';
import { scoreTicker } from './engine';
import type { Metrics } from './filters';

describe('scoreFromBands (밴드 higher/lower)', () => {
  it('PER (lower, negativeZero)', () => {
    const per = CRITERIA_BY_KEY['per'];
    expect(scoreFromBands(8, per)).toBe(5);
    expect(scoreFromBands(12, per)).toBe(4);
    expect(scoreFromBands(45, per)).toBe(1);
    expect(scoreFromBands(60, per)).toBe(0);
    expect(scoreFromBands(-5, per)).toBe(0); // 적자 → 0
  });

  it('ROE (higher)', () => {
    const roe = CRITERIA_BY_KEY['roe'];
    expect(scoreFromBands(0.25, roe)).toBe(5);
    expect(scoreFromBands(0.12, roe)).toBe(3);
    expect(scoreFromBands(-0.1, roe)).toBe(0);
  });
});

describe('결측 처리', () => {
  it('수동 기준 결측 → 중립 3, 자동 기준 결측 → 제외(null)', () => {
    const res = scoreTicker('TEST', { per: 9, roe: 0.22 });
    const moat = res.criteria.find((c) => c.key === 'moat')!;
    expect(moat.subscore).toBe(3.0);
    expect(moat.isDefault).toBe(true);
    const pbr = res.criteria.find((c) => c.key === 'pbr')!;
    expect(pbr.subscore).toBeNull();
    expect(pbr.isDefault).toBe(false);
  });
});

describe('종합점수 범위 & 하드필터', () => {
  it('우량주는 종합 70+ & 필터 통과', () => {
    const good: Metrics = {
      per: 9,
      pbr: 0.9,
      roe: 0.25,
      ev_ebitda: 5,
      dividend_yield: 0.03,
      debt_to_equity: 0.4,
      retention: 0.7,
      growth_rate: 0.22,
      operating_margin: 0.28,
      moving_average: 5,
      volume: 4,
      rsi_macd: 4,
      institutional: 4,
      valuation_band: 5,
      risk_reward: 4,
      price: 100,
      ma120: 80,
      valuation_percentile: 15,
    };
    const res = scoreTicker('GOOD', good, 'balanced');
    expect(res.composite).not.toBeNull();
    expect(res.composite!).toBeGreaterThanOrEqual(0);
    expect(res.composite!).toBeLessThanOrEqual(100);
    expect(res.composite!).toBeGreaterThanOrEqual(70);
    expect(res.passedFilter).toBe(true);
  });

  it('부실주(적자+고부채)는 필터 2개+ 탈락', () => {
    const bad: Metrics = {
      per: -5,
      roe: -0.1,
      operating_margin: -0.05,
      debt_to_equity: 5,
      price: 50,
      ma120: 80,
      valuation_percentile: 90,
    };
    const res = scoreTicker('BAD', bad);
    expect(res.passedFilter).toBe(false);
    expect(res.filterFailures.length).toBeGreaterThanOrEqual(2);
  });
});

describe('프리셋이 가중치를 바꾼다', () => {
  it('가치형과 성장형 종합점수가 달라야', () => {
    const m: Metrics = {
      per: 9,
      pbr: 0.9,
      growth_rate: 0.25,
      operating_margin: 0.3,
      dividend_yield: 0.04,
    };
    const value = scoreTicker('X', m, 'value').composite;
    const growth = scoreTicker('X', m, 'growth').composite;
    expect(value).not.toBeNull();
    expect(growth).not.toBeNull();
    expect(value).not.toBe(growth);
  });
});
