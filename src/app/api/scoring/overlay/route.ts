import { NextRequest } from 'next/server';
import { auth } from '@/features/auth/model/auth';
import {
  clearUserOverlay,
  getUserOverlay,
  setUserOverlay,
  type OverlayInput,
} from '@/features/scoring/api/overlays';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ overlay: null, authenticated: false });

  const symbol = request.nextUrl.searchParams.get('symbol') ?? '';
  if (!symbol.trim()) return Response.json({ error: 'missing_symbol' }, { status: 400 });

  try {
    const overlay = await getUserOverlay(userId, symbol);
    return Response.json({ overlay, authenticated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'unauthorized', message: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { symbol?: string } & OverlayInput;
    const symbol = body.symbol ?? '';
    if (!symbol.trim()) return Response.json({ error: 'missing_symbol' }, { status: 400 });
    const overlay = await setUserOverlay(userId, symbol, body);
    return Response.json({ overlay, authenticated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'bad_request', message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'unauthorized', message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const symbol = request.nextUrl.searchParams.get('symbol') ?? '';
  if (!symbol.trim()) return Response.json({ error: 'missing_symbol' }, { status: 400 });

  try {
    await clearUserOverlay(userId, symbol);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'bad_request', message }, { status: 400 });
  }
}
