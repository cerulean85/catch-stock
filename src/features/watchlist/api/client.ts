import type { WatchlistResult } from '../model/types';

export async function fetchWatchlist(): Promise<WatchlistResult> {
  const res = await fetch('/api/watchlist', { cache: 'no-store' });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as WatchlistResult;
}

export async function addWatchlistItem(symbol: string): Promise<void> {
  const res = await fetch('/api/watchlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ symbol }),
  });
  if (!res.ok) throw new Error(await readError(res));
}

export async function removeWatchlistItem(symbol: string): Promise<void> {
  const res = await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await readError(res));
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body.message ?? `Watchlist request failed (${res.status})`;
  } catch {
    return `Watchlist request failed (${res.status})`;
  }
}
