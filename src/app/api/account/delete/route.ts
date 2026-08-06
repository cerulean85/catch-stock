import { auth } from '@/features/auth/model/auth';
import { deleteUserById } from '@/features/auth/api/delete-account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await deleteUserById(userId);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
}
