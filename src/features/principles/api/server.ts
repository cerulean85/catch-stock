import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { investmentPrinciples } from '@/shared/db/schema';

export async function getPrinciple(userId: string): Promise<string> {
  const rows = await db
    .select({ content: investmentPrinciples.content })
    .from(investmentPrinciples)
    .where(eq(investmentPrinciples.userId, userId))
    .limit(1);
  return rows[0]?.content ?? '';
}

export async function savePrinciple(userId: string, content: string): Promise<void> {
  await db
    .insert(investmentPrinciples)
    .values({ userId, content })
    .onConflictDoUpdate({
      target: investmentPrinciples.userId,
      set: { content, updatedAt: new Date() },
    });
}
