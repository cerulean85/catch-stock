import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { marketNotes } from '@/shared/db/schema';
import { EMPTY_NOTE, type MarketNote } from '../model/note';

export async function getMarketNote(userId: string): Promise<MarketNote> {
  const rows = await db
    .select({
      preOpen: marketNotes.preOpen,
      intraday: marketNotes.intraday,
      postClose: marketNotes.postClose,
    })
    .from(marketNotes)
    .where(eq(marketNotes.userId, userId))
    .limit(1);
  return rows[0] ?? EMPTY_NOTE;
}

export async function saveMarketNote(userId: string, note: MarketNote): Promise<void> {
  await db
    .insert(marketNotes)
    .values({ userId, ...note })
    .onConflictDoUpdate({
      target: marketNotes.userId,
      set: { ...note, updatedAt: new Date() },
    });
}
