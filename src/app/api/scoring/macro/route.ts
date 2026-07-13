import { snapshot } from '@/shared/lib/fred';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const snap = await snapshot();
    return Response.json({ macro: snap });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
}
