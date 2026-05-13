'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { JournalValidationError, parseJournalInput } from '../model/validate';
import {
  createJournal as dbCreate,
  deleteJournal as dbDelete,
  updateJournal as dbUpdate,
} from './server';

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');
  return userId;
}

export type ActionState = { error: string } | null;

export async function createJournalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  let input;
  try {
    input = parseJournalInput(formData);
  } catch (e) {
    if (e instanceof JournalValidationError) return { error: e.message };
    throw e;
  }
  const journal = await dbCreate(userId, input);
  revalidatePath('/journal');
  redirect(`/journal/${journal.id}`);
}

export async function updateJournalAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  let input;
  try {
    input = parseJournalInput(formData);
  } catch (e) {
    if (e instanceof JournalValidationError) return { error: e.message };
    throw e;
  }
  const updated = await dbUpdate(userId, id, input);
  if (!updated) return { error: '일지를 찾을 수 없습니다.' };
  revalidatePath('/journal');
  revalidatePath(`/journal/${id}`);
  redirect(`/journal/${id}`);
}

export async function deleteJournalAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await dbDelete(userId, id);
  revalidatePath('/journal');
  redirect('/journal');
}
