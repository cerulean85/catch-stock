import 'server-only';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { journals } from '@/shared/db/schema';
import type { Journal, JournalFilters, JournalInput } from '../model/types';

type DbRow = typeof journals.$inferSelect;

function toJournal(row: DbRow): Journal {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    content: row.content,
    tickers: row.tickers ?? [],
    tags: row.tags ?? [],
    tradeTypes: (row.tradeTypes ?? []) as Journal['tradeTypes'],
    riskChecks: (row.riskChecks ?? []) as Journal['riskChecks'],
    tradeQty: row.tradeQty,
    tradePrice: row.tradePrice,
    tradeFee: row.tradeFee,
    sentiment: row.sentiment,
    horizon: row.horizon as Journal['horizon'],
    targetReturn: row.targetReturn,
    actualReturn: row.actualReturn,
    tradedAt: row.tradedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toInsertValues(userId: string, input: JournalInput) {
  return {
    userId,
    title: input.title,
    content: input.content,
    tickers: input.tickers,
    tags: input.tags,
    tradeTypes: input.tradeTypes,
    riskChecks: input.riskChecks,
    tradeQty: input.tradeQty == null ? null : String(input.tradeQty),
    tradePrice: input.tradePrice == null ? null : String(input.tradePrice),
    tradeFee: input.tradeFee == null ? null : String(input.tradeFee),
    sentiment: input.sentiment,
    horizon: input.horizon,
    targetReturn: input.targetReturn == null ? null : String(input.targetReturn),
    actualReturn: input.actualReturn == null ? null : String(input.actualReturn),
    tradedAt: input.tradedAt,
  };
}

export async function listJournals(
  userId: string,
  filters: JournalFilters = {},
): Promise<Journal[]> {
  const conditions = [eq(journals.userId, userId)];

  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    const m = or(ilike(journals.title, term), ilike(journals.content, term));
    if (m) conditions.push(m);
  }

  if (filters.ticker) {
    conditions.push(sql`${journals.tickers} @> ARRAY[${filters.ticker}]::text[]`);
  }
  if (filters.tag) {
    conditions.push(sql`${journals.tags} @> ARRAY[${filters.tag}]::text[]`);
  }
  if (filters.tradeType) {
    conditions.push(sql`${journals.tradeTypes} @> ARRAY[${filters.tradeType}]::text[]`);
  }

  const rows = await db
    .select()
    .from(journals)
    .where(and(...conditions))
    .orderBy(desc(journals.tradedAt));

  return rows.map(toJournal);
}

export async function getJournal(userId: string, id: string): Promise<Journal | null> {
  const rows = await db
    .select()
    .from(journals)
    .where(and(eq(journals.id, id), eq(journals.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? toJournal(row) : null;
}

export async function createJournal(userId: string, input: JournalInput): Promise<Journal> {
  const values = toInsertValues(userId, input);
  const inserted = await db.insert(journals).values(values).returning();
  return toJournal(inserted[0]);
}

export async function updateJournal(
  userId: string,
  id: string,
  input: JournalInput,
): Promise<Journal | null> {
  const values = { ...toInsertValues(userId, input), updatedAt: new Date() };
  const updated = await db
    .update(journals)
    .set(values)
    .where(and(eq(journals.id, id), eq(journals.userId, userId)))
    .returning();
  return updated[0] ? toJournal(updated[0]) : null;
}

export async function deleteJournal(userId: string, id: string): Promise<boolean> {
  const result = await db
    .delete(journals)
    .where(and(eq(journals.id, id), eq(journals.userId, userId)))
    .returning({ id: journals.id });
  return result.length > 0;
}
