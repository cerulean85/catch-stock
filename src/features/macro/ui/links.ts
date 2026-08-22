import type { MacroMetric } from '../model/types';

/** 소스별 원본 페이지. 카드의 숫자를 사람이 직접 대조할 수 있게 링크를 건다. */
const TREASURY_DATASETS: Record<string, string> = {
  'bill-share': 'https://fiscaldata.treasury.gov/datasets/treasury-securities-auctions-data/',
  buyback: 'https://fiscaldata.treasury.gov/datasets/treasury-buybacks/',
  'fiscal-balance': 'https://fiscaldata.treasury.gov/datasets/monthly-treasury-statement/',
};

export interface SourceLink {
  href: string;
  label: string;
}

export function sourceLink(metric: MacroMetric): SourceLink | null {
  if (metric.source === 'manual') {
    return metric.href ? { href: metric.href, label: '확인처' } : null;
  }
  if (metric.source === 'fred' && metric.seriesId) {
    return { href: `https://fred.stlouisfed.org/series/${metric.seriesId}`, label: 'FRED' };
  }
  if (metric.source === 'yahoo' && metric.seriesId) {
    return {
      href: `https://finance.yahoo.com/quote/${encodeURIComponent(metric.seriesId)}`,
      label: 'Yahoo',
    };
  }
  if (metric.source === 'treasury') {
    const href = TREASURY_DATASETS[metric.id];
    return href ? { href, label: '미 재무부' } : null;
  }
  if (metric.source === 'nyfed') {
    return {
      href: 'https://www.newyorkfed.org/markets/counterparties/primary-dealers-statistics',
      label: '뉴욕 연준',
    };
  }
  return null;
}

/** 지표를 다른 눈으로 확인할 수 있는 곳. 소스와 별개로 시황·해설을 보는 자리다. */
export function tradingEconomicsLink(metric: MacroMetric): SourceLink | null {
  const slug = TRADING_ECONOMICS[metric.id];
  return slug
    ? { href: `https://tradingeconomics.com/united-states/${slug}`, label: '해설' }
    : null;
}

const TRADING_ECONOMICS: Record<string, string> = {
  gdp: 'gdp-growth',
  cpi: 'inflation-cpi',
  'core-cpi': 'core-inflation-rate',
  'core-pce': 'pce-price-index-annual-change',
  ppi: 'producer-prices-change',
  payrolls: 'non-farm-payrolls',
  unemployment: 'unemployment-rate',
  claims: 'jobless-claims',
  'continued-claims': 'continuing-jobless-claims',
  'retail-sales': 'retail-sales-annual',
  indpro: 'industrial-production',
  tcu: 'capacity-utilization',
  'durable-orders': 'durable-goods-orders',
  'job-openings': 'job-offers',
  quits: 'job-quits',
  participation: 'labor-force-participation-rate',
  wages: 'average-hourly-earnings',
  sentiment: 'consumer-confidence',
  houst: 'housing-starts',
  permit: 'building-permits',
  'new-home-sales': 'new-home-sales',
  'existing-home-sales': 'existing-home-sales',
  'home-prices': 'case-shiller-home-price-index',
  'mortgage-rate': 'mortgage-rate',
  'vehicle-sales': 'total-vehicle-sales',
  'savings-rate': 'personal-savings',
  dgs10: 'government-bond-yield',
  effr: 'interest-rate',
  m2: 'money-supply-m2',
  'trade-balance': 'balance-of-trade',
};
