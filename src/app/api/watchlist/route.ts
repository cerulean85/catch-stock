import { NextRequest } from 'next/server';
import { auth } from '@/features/auth/model/auth';
import {
  addWatchlistSymbol,
  getWatchlistResult,
  removeWatchlistSymbol,
} from '@/features/watchlist/api/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const session = await auth();
    const result = await getWatchlistResult(session?.user?.id);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'unauthorized', message: '로그인이 필요합니다.' }, { status: 401 });

  try {
    const body = (await request.json()) as { symbol?: string };
    await addWatchlistSymbol(userId, body.symbol ?? '');
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'bad_request', message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'unauthorized', message: '로그인이 필요합니다.' }, { status: 401 });

  try {
    await removeWatchlistSymbol(userId, request.nextUrl.searchParams.get('symbol') ?? '');
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'bad_request', message }, { status: 400 });
  }
}
