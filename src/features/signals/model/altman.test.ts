import { describe, it, expect } from 'vitest';
import { altmanZ } from './altman';

const HEALTHY = {
  workingCapital: 400,
  retainedEarnings: 600,
  ebit: 300,
  marketCap: 3000,
  totalAssets: 1000,
  totalLiabilities: 400,
  revenue: 1200,
};

describe('altmanZ', () => {
  it('건전한 재무는 safe 구간(Z ≥ 2.99)', () => {
    const r = altmanZ(HEALTHY);
    expect(r).not.toBeNull();
    expect(r!.z).toBeGreaterThanOrEqual(2.99);
    expect(r!.zone).toBe('safe');
  });

  it('부실 재무(적자·과다부채)는 distress 구간', () => {
    const r = altmanZ({
      workingCapital: -300,
      retainedEarnings: -500,
      ebit: -100,
      marketCap: 50,
      totalAssets: 1000,
      totalLiabilities: 950,
      revenue: 200,
    });
    expect(r!.z).toBeLessThan(1.81);
    expect(r!.zone).toBe('distress');
  });

  it('총자산/총부채가 0 이하이거나 결측이면 null', () => {
    expect(altmanZ({ ...HEALTHY, totalAssets: 0 })).toBeNull();
    expect(altmanZ({ ...HEALTHY, totalLiabilities: null })).toBeNull();
    expect(altmanZ({ ...HEALTHY, ebit: null })).toBeNull();
  });
});
