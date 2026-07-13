import { NextRequest } from 'next/server';
import { scanForcedLiquidation } from '@/features/signals/api/server';
import type { UniverseName } from '@/features/scoring/model/universe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UNIVERSES: UniverseName[] = ['demo', 'default', 'sp500'];

function optNum(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: NextRequest): Promise<Response> {
  const sp = request.nextUrl.searchParams;
  const uRaw = sp.get('universe');
  const universe = UNIVERSES.includes(uRaw as UniverseName)
    ? (uRaw as UniverseName)
    : undefined;

  try {
    const result = await scanForcedLiquidation({
      universe,
      params: {
        dropThresholdPct: optNum(sp.get('drop')),
        rsiThreshold: optNum(sp.get('rsi')),
        volumeMultiple: optNum(sp.get('volMult')),
      },
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
}
