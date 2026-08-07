export interface TickerSymbol {
  /** 화면에 찍히는 짧은 이름. 지수·선물 통칭이라 로케일과 무관하게 그대로 쓴다. */
  label: string;
  /** Yahoo Finance 심볼 */
  symbol: string;
}

/** 상단 바에 표시할 지표. 순서가 곧 화면 순서다. */
export const TICKER_SYMBOLS: TickerSymbol[] = [
  { label: 'WTI', symbol: 'CL=F' },
  { label: 'US 10Y', symbol: '^TNX' },
  { label: 'US 2Y', symbol: '2YY=F' },
  { label: 'SOX', symbol: '^SOX' },
  { label: 'NDX', symbol: '^NDX' },
  { label: 'DXY', symbol: 'DX-Y.NYB' },
  { label: 'VIX', symbol: '^VIX' },
  { label: 'Gold', symbol: 'GC=F' },
];

export interface TickerQuote {
  label: string;
  price: number;
  changePercent: number;
}
