import type { ScreenerResult } from '../model/types';

export async function fetchScreenerResult(opts: { refresh?: boolean } = {}): Promise<ScreenerResult> {
  const url = opts.refresh ? '/api/screener?refresh=1' : '/api/screener';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { message?: string };
      detail = body.message ?? '';
    } catch {
      // ignore
    }
    throw new Error(`Failed to fetch screener (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  return (await res.json()) as ScreenerResult;
}
