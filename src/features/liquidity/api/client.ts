import type { LiquidityResult } from '../model/types';

export async function fetchLiquidityResult(
  opts: { refresh?: boolean } = {},
): Promise<LiquidityResult> {
  const url = opts.refresh ? '/api/liquidity?refresh=1' : '/api/liquidity';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { message?: string };
      detail = body.message ?? '';
    } catch {
      // ignore
    }
    throw new Error(`Failed to fetch liquidity (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  return (await res.json()) as LiquidityResult;
}

