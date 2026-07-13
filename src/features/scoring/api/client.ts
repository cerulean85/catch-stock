import type { ScoreResult, ScreenResponse } from '../model/types';

// 저장 오버레이의 클라이언트 표현(서버 StoredOverlay와 동일 형태, server-only 모듈 미참조).
export interface OverlayValues {
  moat: number | null;
  tam: number | null;
  governance: number | null;
  geopolitical: number | null;
  institutionalChange: number | null;
  riskTag: string | null;
}

export async function fetchScreen(
  opts: { preset?: string; universe?: string; refresh?: boolean } = {},
): Promise<ScreenResponse> {
  const params = new URLSearchParams();
  if (opts.preset) params.set('preset', opts.preset);
  if (opts.universe) params.set('universe', opts.universe);
  if (opts.refresh) params.set('refresh', '1');
  const qs = params.toString();
  const res = await fetch(`/api/scoring/screen${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { message?: string }).message ?? '';
    } catch {
      // ignore
    }
    throw new Error(`Failed to fetch scoring screen (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  return (await res.json()) as ScreenResponse;
}

// 단일 종목 재조회 — 저장 오버레이가 서버에서 병합된 최신 스코어를 받는다.
export async function fetchScore(symbol: string, preset?: string): Promise<ScoreResult> {
  const params = new URLSearchParams({ symbol });
  if (preset) params.set('preset', preset);
  const res = await fetch(`/api/scoring/score?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch score (${res.status})`);
  }
  return (await res.json()) as ScoreResult;
}

export async function fetchOverlay(
  symbol: string,
): Promise<{ overlay: OverlayValues | null; authenticated: boolean }> {
  const res = await fetch(`/api/scoring/overlay?symbol=${encodeURIComponent(symbol)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch overlay (${res.status})`);
  return (await res.json()) as { overlay: OverlayValues | null; authenticated: boolean };
}

export async function saveOverlay(
  symbol: string,
  values: OverlayValues,
): Promise<OverlayValues> {
  const res = await fetch('/api/scoring/overlay', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, ...values }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { message?: string }).message ?? '';
    } catch {
      // ignore
    }
    throw new Error(`오버레이 저장 실패 (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  return ((await res.json()) as { overlay: OverlayValues }).overlay;
}

export async function clearOverlay(symbol: string): Promise<void> {
  const res = await fetch(`/api/scoring/overlay?symbol=${encodeURIComponent(symbol)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`오버레이 삭제 실패 (${res.status})`);
}
