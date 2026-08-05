'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { normalizePrinciple, validatePrinciple } from '../model/principle';
import { savePrinciple } from './server';

export type PrincipleActionState = { error: string } | null;

export async function savePrincipleAction(content: string): Promise<PrincipleActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');

  const normalized = normalizePrinciple(content);
  const error = validatePrinciple(normalized);
  if (error) return { error };

  await savePrinciple(userId, normalized);
  revalidatePath('/journal');
  return null;
}
