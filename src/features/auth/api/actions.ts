'use server';

import { redirect } from 'next/navigation';
import { auth, signIn, signOut } from '../model/auth';
import { deleteUserById } from './delete-account';

export async function signInWithGoogle(): Promise<void> {
  await signIn('google', { redirectTo: '/' });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/' });
}

export async function deleteAccountAction(): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect('/login');
  }
  await deleteUserById(userId);
  await signOut({ redirectTo: '/' });
}
