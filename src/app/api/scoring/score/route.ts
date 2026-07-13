import { NextRequest } from 'next/server';
import { auth } from '@/features/auth/model/auth';
import { scoreSymbol } from '@/features/scoring/api/server';
import type { Overlay } from '@/features/scoring/api/build-metrics';
import { getUserOverlay, toEngineOverlay } from '@/features/scoring/api/overlays';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OVERLAY_KEYS = [
  'moat',
  'tam',
  'governance',
  'geopolitical',
  'rates_fx',
  'institutional_change',
] as const;

export async function GET(request: NextRequest): Promise<Response> {
  const sp = request.nextUrl.searchParams;
  const symbol = sp.get('symbol')?.trim().toUpperCase();
  if (!symbol) {
    return Response.json({ error: 'missing_symbol' }, { status: 400 });
  }
  const preset = sp.get('preset') ?? undefined;

  // 로그인 유저의 저장 오버레이를 기본값으로 깔고, 쿼리 파라미터로 개별 override.
  const session = await auth();
  const userId = session?.user?.id;
  const overlay: Overlay = userId
    ? toEngineOverlay(await getUserOverlay(userId, symbol))
    : {};
  for (const k of OVERLAY_KEYS) {
    const v = sp.get(k);
    if (v !== null && v !== '' && Number.isFinite(Number(v))) {
      overlay[k] = Number(v);
    }
  }

  try {
    const result = await scoreSymbol(symbol, { preset, overlay });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
}
