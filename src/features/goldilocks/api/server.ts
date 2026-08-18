import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { goldilocksScans } from '@/shared/db/schema';
import type { GeminiSource } from '@/shared/lib/gemini';
import type { ParsedScan } from '../model/parse';
import type { GoldilocksScan } from '../model/types';

type ScanRow = typeof goldilocksScans.$inferSelect;

function toScan(row: ScanRow): GoldilocksScan {
  return {
    id: row.id,
    createdAt: row.createdAt,
    candidates: row.candidates,
    note: row.note,
    sources: row.sources as GeminiSource[],
    searched: row.searched,
    model: row.model,
  };
}

/** 가장 최근 탐색 결과. 아직 한 번도 안 돌렸으면 null. */
export async function getLatestGoldilocksScan(userId: string): Promise<GoldilocksScan | null> {
  const rows = await db
    .select()
    .from(goldilocksScans)
    .where(eq(goldilocksScans.userId, userId))
    .orderBy(desc(goldilocksScans.createdAt))
    .limit(1);

  return rows[0] ? toScan(rows[0]) : null;
}

export async function saveGoldilocksScan(input: {
  userId: string;
  parsed: ParsedScan;
  sources: GeminiSource[];
  searched: boolean;
  model: string;
}): Promise<GoldilocksScan> {
  const [row] = await db
    .insert(goldilocksScans)
    .values({
      userId: input.userId,
      candidates: input.parsed.candidates,
      note: input.parsed.note,
      sources: input.sources,
      searched: input.searched,
      model: input.model,
    })
    .returning();

  return toScan(row);
}
