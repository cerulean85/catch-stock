import sp500 from '@/shared/constants/sp500.json';

/**
 * 스코어링 스크리닝 유니버스 — 기본은 대표 대형주 서브셋(무료 티어·yahoo 레이트리밋 절약).
 * inv-stds `data/universe.py` 이식. 이름/섹터는 sp500.json 을 우선 사용한다.
 */

export interface UniverseTicker {
  symbol: string;
  name: string;
  sector: string;
}

// 섹터 다양성을 담은 대표 30 종목 (기본).
const DEFAULT_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AVGO', 'ORCL', 'ADBE', 'CRM',
  'AMZN', 'TSLA', 'HD', 'MCD', 'DIS',
  'UNH', 'JNJ', 'LLY', 'PFE',
  'JPM', 'BAC', 'V', 'GS',
  'CAT', 'BA', 'XOM', 'CVX',
  'PG', 'KO', 'WMT', 'COST',
];

// 빠른 시연용 데모 유니버스.
const DEMO_SYMBOLS = ['MSFT', 'AAPL', 'NVDA', 'META', 'JPM', 'JNJ', 'KO', 'XOM', 'PFE', 'COST'];

const SP500 = sp500 as UniverseTicker[];
const BY_SYMBOL = new Map(SP500.map((t) => [t.symbol, t]));

function toTicker(symbol: string): UniverseTicker {
  return BY_SYMBOL.get(symbol) ?? { symbol, name: symbol, sector: '—' };
}

export type UniverseName = 'demo' | 'default' | 'sp500';

export function getUniverse(name: UniverseName = 'default'): UniverseTicker[] {
  if (name === 'demo') return DEMO_SYMBOLS.map(toTicker);
  if (name === 'sp500') return SP500;
  return DEFAULT_SYMBOLS.map(toTicker);
}
