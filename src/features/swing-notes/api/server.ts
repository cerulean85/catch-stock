import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { swingNotes } from '@/shared/db/schema';

export async function getSwingNote(userId: string): Promise<string> {
  const rows = await db
    .select({ content: swingNotes.content })
    .from(swingNotes)
    .where(eq(swingNotes.userId, userId))
    .limit(1);
  return rows[0]?.content ?? '';
}

export async function saveSwingNote(userId: string, content: string): Promise<void> {
  await db
    .insert(swingNotes)
    .values({ userId, content })
    .onConflictDoUpdate({
      target: swingNotes.userId,
      set: { content, updatedAt: new Date() },
    });
}
