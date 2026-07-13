/**
 * Altman Z-Score (원판, 상장 제조업 기준) — concept2.md 전략1 조건 C의 신용/부도위험 판정.
 *
 *   Z = 1.2·(WC/TA) + 1.4·(RE/TA) + 3.3·(EBIT/TA) + 0.6·(MVE/TL) + 1.0·(Sales/TA)
 *
 * 구간: Z ≥ 2.99 안전(safe) · 1.81 ≤ Z < 2.99 회색(grey) · Z < 1.81 부도위험(distress).
 * MVE(시장가치자본)는 시가총액으로 근사한다.
 */

export interface AltmanInputs {
  workingCapital: number | null; // WC = 유동자산 - 유동부채
  retainedEarnings: number | null; // RE
  ebit: number | null; // 영업이익
  marketCap: number | null; // MVE 근사
  totalAssets: number | null; // TA
  totalLiabilities: number | null; // TL
  revenue: number | null; // Sales
}

export type AltmanZone = 'safe' | 'grey' | 'distress';

export interface AltmanResult {
  z: number;
  zone: AltmanZone;
}

export function altmanZ(i: AltmanInputs): AltmanResult | null {
  const { workingCapital, retainedEarnings, ebit, marketCap, totalAssets, totalLiabilities, revenue } = i;
  // 분모가 0/음수거나 필수값이 결측이면 판정 불가.
  if (totalAssets === null || totalAssets <= 0) return null;
  if (totalLiabilities === null || totalLiabilities <= 0) return null;
  if (
    workingCapital === null ||
    retainedEarnings === null ||
    ebit === null ||
    marketCap === null ||
    revenue === null
  ) {
    return null;
  }

  const z =
    1.2 * (workingCapital / totalAssets) +
    1.4 * (retainedEarnings / totalAssets) +
    3.3 * (ebit / totalAssets) +
    0.6 * (marketCap / totalLiabilities) +
    1.0 * (revenue / totalAssets);

  const zone: AltmanZone = z >= 2.99 ? 'safe' : z >= 1.81 ? 'grey' : 'distress';
  return { z: Math.round(z * 100) / 100, zone };
}
