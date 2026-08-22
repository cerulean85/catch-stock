import { describe, expect, it } from 'vitest';
import { combineSignals, readRegime, regimeOf } from './regime';

/** 고용은 증가분으로 판정하므로, 월 증가폭을 누적 지수로 되돌려 준다. */
function payrollsFromGains(gains: number[], base = 150_000): number[] {
  const series = [base];
  for (const gain of gains) series.push(series[series.length - 1]! - gain);
  return series;
}

/** 실업률이 바닥에 붙어 있는 계열. 삼 룰 갭 0. */
const LOW_UNEMPLOYMENT = Array(15).fill(3.9);
/** 삼 룰이 발동하는 계열. 3개월 평균 4.4, 직전 저점 3.6 → 갭 0.8%p. */
const RISING_UNEMPLOYMENT = [
  4.5, 4.4, 4.3, 4.1, 3.9, 3.7, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6,
];

const ACCELERATING_PCE = [106.5, 105.9, 105.4, 105.0, 104.7, 104.4, 104.1];
const COOLING_PCE = [105.2, 105.0, 104.9, 104.7, 104.3, 103.9, 103.5];
const STRONG_PAYROLLS = payrollsFromGains([180, 160, 170, 150, 160, 155, 150]);
const WEAK_PAYROLLS = payrollsFromGains([20, 10, 5, 30, 15, 20, 10]);

describe('regimeOf', () => {
  it('두 축의 네 조합을 각각 다른 국면으로 가른다', () => {
    expect(regimeOf(true, true).id).toBe('expansion');
    expect(regimeOf(true, false).id).toBe('slowdown');
    expect(regimeOf(false, false).id).toBe('recession');
    expect(regimeOf(false, true).id).toBe('recovery');
  });
});

describe('combineSignals', () => {
  it('같은 방향이면 그대로 간다', () => {
    expect(combineSignals('improving', 'improving')).toBe('improving');
    expect(combineSignals('weakening', 'weakening')).toBe('weakening');
  });

  it('한쪽이 중립이면 나머지를 따른다', () => {
    expect(combineSignals('neutral', 'weakening')).toBe('weakening');
    expect(combineSignals('improving', 'neutral')).toBe('improving');
  });

  it('정반대면 단정하지 않는다', () => {
    expect(combineSignals('improving', 'weakening')).toBe('mixed');
  });
});

describe('readRegime', () => {
  it('물가가 가속하고 고용도 좋으면 확장', () => {
    const reading = readRegime({
      corePce: ACCELERATING_PCE,
      payrolls: STRONG_PAYROLLS,
      unemployment: LOW_UNEMPLOYMENT,
    });
    expect(reading?.regime?.id).toBe('expansion');
    expect(reading?.employment).toBe('improving');
  });

  it('물가가 꺾이고 고용도 무너지면 침체', () => {
    const reading = readRegime({
      corePce: COOLING_PCE,
      payrolls: WEAK_PAYROLLS,
      unemployment: RISING_UNEMPLOYMENT,
    });
    expect(reading?.regime?.id).toBe('recession');
    expect(reading?.employment).toBe('weakening');
  });

  it('실업률은 바닥인데 고용 증가가 약하면 단정하지 않는다', () => {
    // 2026-08 실제 상황이다. 실업률은 12개월 최저인데 월평균 증가는 2만 명이었다.
    const reading = readRegime({
      corePce: COOLING_PCE,
      payrolls: WEAK_PAYROLLS,
      unemployment: LOW_UNEMPLOYMENT,
    });
    expect(reading?.employment).toBe('mixed');
    expect(reading?.regime).toBeNull();
    expect(reading?.candidates).toEqual(['recovery', 'recession']);
    expect(reading?.summary).toContain('엇갈림');
  });

  it('가속 국면에서 엇갈리면 확장과 둔화가 후보가 된다', () => {
    const reading = readRegime({
      corePce: ACCELERATING_PCE,
      payrolls: WEAK_PAYROLLS,
      unemployment: LOW_UNEMPLOYMENT,
    });
    expect(reading?.candidates).toEqual(['expansion', 'slowdown']);
  });

  it('판정 근거에 숫자와 기준선을 남긴다', () => {
    const reading = readRegime({
      corePce: COOLING_PCE,
      payrolls: WEAK_PAYROLLS,
      unemployment: LOW_UNEMPLOYMENT,
    });
    expect(reading?.inflationDetail).toMatch(/근원 PCE 3개월 연율 [\d.]+%/);
    expect(reading?.inflationDetail).toMatch(/둔화/);
    expect(reading?.employmentDetails[0]).toMatch(/실업률 [\d.]+%/);
    expect(reading?.employmentDetails[1]).toMatch(/기준 5만 명/);
    expect(reading?.employmentDetails.at(-1)).toMatch(/단정 보류/);
  });

  it('자료가 없으면 판정하지 않는다', () => {
    expect(readRegime({ corePce: [], payrolls: [], unemployment: [] })).toBeNull();
  });
});
