'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { normalizeSwingNote, validateSwingNote } from '../model/note';
import { saveSwingNote } from './server';

export type SwingNoteActionState = { error: string } | null;

export async function saveSwingNoteAction(content: string): Promise<SwingNoteActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');

  const normalized = normalizeSwingNote(content);
  const error = validateSwingNote(normalized);
  if (error) return { error };

  await saveSwingNote(userId, normalized);
  revalidatePath('/journal');
  return null;
}
