import { NextRequest } from 'next/server';
import { scanMicrocapAlpha } from '@/features/signals/api/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function optNum(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: NextRequest): Promise<Response> {
  const sp = request.nextUrl.searchParams;
  try {
    const result = await scanMicrocapAlpha({
      limit: optNum(sp.get('limit')),
      params: {
        minCap: optNum(sp.get('minCap')),
        maxCap: optNum(sp.get('maxCap')),
        revenueCagrMin: optNum(sp.get('cagr')),
        dollarVolumeMax: optNum(sp.get('dv')),
      },
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
}
