import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { users } from '@/shared/db/schema';

export async function deleteUserById(userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
}
