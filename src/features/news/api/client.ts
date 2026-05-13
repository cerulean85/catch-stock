import type { MarketNewsResult } from '../model/types';

export async function fetchMarketNews(opts: { refresh?: boolean } = {}): Promise<MarketNewsResult> {
  const url = opts.refresh ? '/api/news?refresh=1' : '/api/news';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { message?: string };
      detail = body.message ?? '';
    } catch {
      // ignore
    }
    throw new Error(`Failed to fetch news (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  return (await res.json()) as MarketNewsResult;
}
