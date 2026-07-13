import { describe, it, expect } from 'vitest';
import { detectMicrocapAlpha, revenueCagr } from './microcap';

// 최신→과거: 매년 20% 성장 (100 → 144), 3년 흑자, 소형·저유동성.
const GOOD = {
  marketCap: 300_000_000,
  netIncomeHistory: [15, 12, 8, 5],
  revenueHistory: [144, 120, 100, 90],
  freeCashFlow: 20,
  avgDollarVolume: 300_000,
};

describe('revenueCagr', () => {
  it('2년 span 20% 성장 → 약 0.2', () => {
    const c = revenueCagr([144, 120, 100], 2);
    expect(c).toBeCloseTo(0.2, 2);
  });
  it('데이터 부족/음수 매출이면 null', () => {
    expect(revenueCagr([100, 120], 3)).toBeNull();
    expect(revenueCagr([100, 120, -5], 2)).toBeNull(); // base(과거) 매출이 음수
  });
});

describe('detectMicrocapAlpha', () => {
  it('모든 조건 충족 시 triggered', () => {
    const s = detectMicrocapAlpha(GOOD);
    expect(s.conditions).toEqual({
      capBand: true,
      profitStreak: true,
      fcfPositive: true,
      revenueGrowth: true,
      lowLiquidity: true,
    });
    expect(s.triggered).toBe(true);
    expect(s.revenueCagrPct).toBeCloseTo(20, 0);
  });

  it('시총이 밴드를 벗어나면(대형주) 탈락', () => {
    const s = detectMicrocapAlpha({ ...GOOD, marketCap: 50_000_000_000 });
    expect(s.conditions.capBand).toBe(false);
    expect(s.triggered).toBe(false);
  });

  it('최근 3년 중 적자가 있으면 profitStreak 탈락', () => {
    const s = detectMicrocapAlpha({ ...GOOD, netIncomeHistory: [15, -2, 8, 5] });
    expect(s.conditions.profitStreak).toBe(false);
    expect(s.triggered).toBe(false);
  });

  it('거래대금이 임계 이상이면 lowLiquidity 탈락', () => {
    const s = detectMicrocapAlpha({ ...GOOD, avgDollarVolume: 2_000_000 });
    expect(s.conditions.lowLiquidity).toBe(false);
    expect(s.triggered).toBe(false);
  });
});
