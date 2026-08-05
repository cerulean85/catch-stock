'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { normalizeNote, validateNote, type MarketNote } from '../model/note';
import { saveMarketNote } from './server';

export type MarketNoteActionState = { error: string } | null;

export async function saveMarketNoteAction(note: MarketNote): Promise<MarketNoteActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');

  const normalized = normalizeNote(note);
  const error = validateNote(normalized);
  if (error) return { error };

  await saveMarketNote(userId, normalized);
  revalidatePath('/journal');
  return null;
}
