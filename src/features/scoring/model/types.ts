import type { ScoreResult } from './engine';
import type { MacroSnapshot } from '@/shared/lib/fred';
import type { UniverseName } from './universe';

/** 스크리닝 결과 행 — 상세는 detail 로 접힘. */
export interface ScoredItem {
  symbol: string;
  name: string;
  sector: string;
  composite: number | null;
  passedFilter: boolean;
  headline: string;
  areas: { area: string; label: string; score: number | null }[];
  detail: ScoreResult;
}

export interface CacheInfo {
  hit: boolean;
  ttlSeconds: number;
}

export interface ScreenResponse {
  generatedAt: string;
  cache: CacheInfo;
  preset: string;
  universe: UniverseName;
  filters: string[];
  macro: MacroSnapshot | null;
  items: ScoredItem[];
  skipped: { symbol: string; reason: string }[];
}

export interface MetaResponse {
  criteria: {
    number: number;
    key: string;
    nameKo: string;
    area: string;
    areaLabel: string;
    status: string;
    source: string;
    note: string;
  }[];
  presets: { key: string; nameKo: string }[];
  filters: { key: string; nameKo: string; defaultOn: boolean; reason: string }[];
}

export type { ScoreResult } from './engine';
export type { MacroSnapshot } from '@/shared/lib/fred';
