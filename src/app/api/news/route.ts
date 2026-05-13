import { NextRequest } from 'next/server';
import { getMarketNews } from '@/features/news/api/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const refresh = request.nextUrl.searchParams.get('refresh') === '1';
  try {
    const result = await getMarketNews({ refresh });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
}
