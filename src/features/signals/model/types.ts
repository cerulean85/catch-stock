import type { ForcedLiquidationSignal } from './detect';
import type { AltmanResult } from './altman';
import type { MicrocapSignal } from './microcap';

export interface SignalItem {
  symbol: string;
  name: string;
  sector: string;
  signal: ForcedLiquidationSignal;
  altman: AltmanResult | null; // 전략1 조건 C(부도위험) 부분 판정. 결측 시 null.
}

export interface SignalScanParams {
  dropThresholdPct: number;
  rsiThreshold: number;
  volumeMultiple: number;
  dropWindow: number;
  volumeWindow: number;
}

export interface SignalScanResponse {
  strategy: 'forced_liquidation';
  label: string;
  asOf: string; // YYYY-MM-DD
  params: SignalScanParams;
  omitted: string[]; // 데이터 미가용으로 판정 생략한 조건
  scanned: number;
  candidates: SignalItem[];
}

export interface MicrocapItem {
  symbol: string;
  name: string;
  sector: string;
  signal: MicrocapSignal;
}

export interface MicrocapScanParams {
  minCap: number;
  maxCap: number;
  profitYears: number;
  revenueCagrMin: number;
  dollarVolumeMax: number;
  limit: number;
}

export interface MicrocapScanResponse {
  strategy: 'microcap_alpha';
  label: string;
  asOf: string;
  params: MicrocapScanParams;
  omitted: string[];
  scanned: number;
  candidates: MicrocapItem[];
  note?: string; // FMP 키 없음 등 스캔 제약 안내
}
