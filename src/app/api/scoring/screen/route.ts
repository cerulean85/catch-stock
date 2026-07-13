import { NextRequest } from 'next/server';
import { screenUniverse } from '@/features/scoring/api/server';
import type { UniverseName } from '@/features/scoring/model/universe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UNIVERSES: UniverseName[] = ['demo', 'default', 'sp500'];

export async function GET(request: NextRequest): Promise<Response> {
  const sp = request.nextUrl.searchParams;
  const preset = sp.get('preset') ?? undefined;
  const refresh = sp.get('refresh') === '1';
  const uRaw = sp.get('universe');
  const universe = UNIVERSES.includes(uRaw as UniverseName)
    ? (uRaw as UniverseName)
    : undefined;

  try {
    const result = await screenUniverse({ preset, universe, refresh });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
}
