import { describe, it, expect } from 'vitest';
import { detectForcedLiquidation } from './detect';
import type { Ohlcv } from '@/features/scoring/model/indicators';

/** close 배열 + 균일 거래량(옵션으로 마지막 봉만 폭증)으로 Ohlcv 생성. */
function bars(close: number[], lastVolumeMultiple = 1): Ohlcv {
  const volume = close.map((_, i) => (i === close.length - 1 ? 1000 * lastVolumeMultiple : 1000));
  return { high: [...close], low: [...close], close, volume };
}

const CRASH = [
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
  98, 96, 94, 92, 90, 88, 86, 84, 82, 80, 76, 72, 68, 64, 60,
];

describe('detectForcedLiquidation', () => {
  it('세 조건(급락·과매도·거래량폭증) 모두 충족 시 triggered', () => {
    const s = detectForcedLiquidation(bars(CRASH, 5));
    expect(s).not.toBeNull();
    expect(s!.dropPct).toBeLessThanOrEqual(-20); // 80 → 60 = -25%
    expect(s!.rsi).toBeLessThanOrEqual(25);
    expect(s!.volumeRatio).toBeGreaterThanOrEqual(4);
    expect(s!.conditions).toEqual({ drop: true, oversold: true, volumeSpike: true });
    expect(s!.triggered).toBe(true);
  });

  it('거래량 폭증이 없으면 triggered=false', () => {
    const s = detectForcedLiquidation(bars(CRASH, 1)); // 마지막 봉 거래량 평소와 동일
    expect(s!.conditions.drop).toBe(true);
    expect(s!.conditions.oversold).toBe(true);
    expect(s!.conditions.volumeSpike).toBe(false);
    expect(s!.triggered).toBe(false);
  });

  it('횡보장에서는 어떤 조건도 충족하지 않음', () => {
    const flat = Array.from({ length: 30 }, () => 100);
    const s = detectForcedLiquidation(bars(flat, 1));
    expect(s!.triggered).toBe(false);
    expect(s!.conditions.drop).toBe(false);
    expect(s!.conditions.volumeSpike).toBe(false);
  });

  it('임계값 옵션 오버라이드 반영', () => {
    // 기본 -20%로는 미달인 완만한 하락을 -5% 임계값으로 낮추면 drop=true.
    const mild = [
      ...Array.from({ length: 20 }, () => 100),
      99, 98, 97, 96, 95, 94, 93, 92, 91, 90,
    ];
    const strict = detectForcedLiquidation(bars(mild, 1));
    expect(strict!.conditions.drop).toBe(false);
    const loose = detectForcedLiquidation(bars(mild, 1), { dropThresholdPct: -5 });
    expect(loose!.conditions.drop).toBe(true);
  });

  it('데이터가 부족하면 null', () => {
    expect(detectForcedLiquidation(bars([100, 99, 98], 1))).toBeNull();
  });
});
