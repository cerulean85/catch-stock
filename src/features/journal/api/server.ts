import 'server-only';
import { and, eq, gte, ilike, lt, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { journals } from '@/shared/db/schema';
import { effectiveReturn } from '../model/metrics';
import {
  DEFAULT_SORT,
  PAGE_SIZE,
  TRADE_TYPES,
  type Journal,
  type JournalFilters,
  type JournalInput,
  type JournalListResult,
  type JournalSort,
  type JournalStats,
  type MonthlyStat,
  type RiskComplianceStat,
  type TradeHighlight,
  type TradeType,
} from '../model/types';

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
    sellPrice: row.sellPrice,
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
  const s = (n: number | null) => (n == null ? null : String(n));
  return {
    userId,
    title: input.title,
    content: input.content,
    tickers: input.tickers,
    tags: input.tags,
    tradeTypes: input.tradeTypes,
    riskChecks: input.riskChecks,
    tradeQty: s(input.tradeQty),
    tradePrice: s(input.tradePrice),
    sellPrice: s(input.sellPrice),
    tradeFee: s(input.tradeFee),
    sentiment: input.sentiment,
    horizon: input.horizon,
    targetReturn: s(input.targetReturn),
    actualReturn: s(input.actualReturn),
    tradedAt: input.tradedAt,
  };
}

function buildConditions(userId: string, filters: JournalFilters): SQL[] {
  const conditions: SQL[] = [eq(journals.userId, userId)];

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
  return conditions;
}

// COALESCE(청산가 기반 계산 수익률, 수동 actualReturn) — sort=return에서 DB 정렬용.
const returnSqlExpr = sql`COALESCE(CASE WHEN ${journals.sellPrice} IS NOT NULL AND ${journals.tradePrice} IS NOT NULL AND ${journals.tradePrice} <> 0 THEN (${journals.sellPrice} - ${journals.tradePrice}) / ${journals.tradePrice} * 100 ELSE NULL END, ${journals.actualReturn})`;

function orderBySql(sort: JournalSort): SQL[] {
  if (sort === 'oldest') {
    return [sql`${journals.tradedAt} ASC`];
  }
  if (sort === 'sentiment') {
    return [sql`${journals.sentiment} DESC NULLS LAST`, sql`${journals.tradedAt} DESC`];
  }
  if (sort === 'return') {
    return [sql`${returnSqlExpr} DESC NULLS LAST`, sql`${journals.tradedAt} DESC`];
  }
  return [sql`${journals.tradedAt} DESC`];
}

export async function listJournals(
  userId: string,
  filters: JournalFilters = {},
): Promise<JournalListResult> {
  const conditions = buildConditions(userId, filters);
  const where = and(...conditions);
  const sort = filters.sort ?? DEFAULT_SORT;
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journals)
    .where(where);
  const total = countRows[0]?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = await db
    .select()
    .from(journals)
    .where(where)
    .orderBy(...orderBySql(sort))
    .limit(PAGE_SIZE)
    .offset(offset);

  return { items: rows.map(toJournal), total, page, pageCount };
}

/** 페이지네이션 없이 필터에 맞는 전체 일지 반환 (내보내기·통계용). */
export async function listAllJournals(
  userId: string,
  filters: JournalFilters = {},
): Promise<Journal[]> {
  const rows = await db
    .select()
    .from(journals)
    .where(and(...buildConditions(userId, filters)))
    .orderBy(sql`${journals.tradedAt} DESC`);
  return rows.map(toJournal);
}

/** 기간(`from` 이상 `to` 미만)에 걸린 일지 전체 반환 (캘린더용). */
export async function listJournalsInRange(
  userId: string,
  filters: JournalFilters,
  from: Date,
  to: Date,
): Promise<Journal[]> {
  const conditions = buildConditions(userId, filters);
  conditions.push(gte(journals.tradedAt, from), lt(journals.tradedAt, to));
  const rows = await db
    .select()
    .from(journals)
    .where(and(...conditions))
    .orderBy(sql`${journals.tradedAt} ASC`);
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

export type UpdateResult =
  | { ok: true; journal: Journal }
  | { ok: false; reason: 'notfound' | 'conflict' };

export async function updateJournal(
  userId: string,
  id: string,
  input: JournalInput,
  expectedUpdatedAt?: Date,
): Promise<UpdateResult> {
  const existing = await getJournal(userId, id);
  if (!existing) return { ok: false, reason: 'notfound' };
  if (expectedUpdatedAt && existing.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    return { ok: false, reason: 'conflict' };
  }
  const values = { ...toInsertValues(userId, input), updatedAt: new Date() };
  const updated = await db
    .update(journals)
    .set(values)
    .where(and(eq(journals.id, id), eq(journals.userId, userId)))
    .returning();
  return updated[0]
    ? { ok: true, journal: toJournal(updated[0]) }
    : { ok: false, reason: 'notfound' };
}

export async function deleteJournal(userId: string, id: string): Promise<boolean> {
  const result = await db
    .delete(journals)
    .where(and(eq(journals.id, id), eq(journals.userId, userId)))
    .returning({ id: journals.id });
  return result.length > 0;
}

function avg(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function winRate(returns: number[]): number | null {
  return returns.length ? returns.filter((r) => r > 0).length / returns.length : null;
}

export async function getJournalStats(userId: string): Promise<JournalStats> {
  const all = await listAllJournals(userId);

  const withReturns = all
    .map((j) => ({ j, r: effectiveReturn(j) }))
    .filter((x): x is { j: Journal; r: number } => x.r != null);
  const allReturns = withReturns.map((x) => x.r);

  // 종목별
  const tickerMap = new Map<string, { count: number; returns: number[] }>();
  for (const j of all) {
    const r = effectiveReturn(j);
    for (const ticker of j.tickers) {
      const entry = tickerMap.get(ticker) ?? { count: 0, returns: [] };
      entry.count += 1;
      if (r != null) entry.returns.push(r);
      tickerMap.set(ticker, entry);
    }
  }
  const tickers = [...tickerMap.entries()]
    .map(([ticker, v]) => ({
      ticker,
      count: v.count,
      avgReturn: avg(v.returns),
      winRate: winRate(v.returns),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // 감정별
  const sentiments = [1, 2, 3, 4, 5].map((sentiment) => {
    const group = withReturns.filter((x) => x.j.sentiment === sentiment);
    const countAll = all.filter((j) => j.sentiment === sentiment).length;
    return { sentiment, count: countAll, avgReturn: avg(group.map((x) => x.r)) };
  });

  // 투자 유형별
  const tradeTypes = (TRADE_TYPES as readonly TradeType[]).map((tradeType) => ({
    tradeType,
    count: all.filter((j) => j.tradeTypes.includes(tradeType)).length,
  }));

  // 손절 설정 준수율 vs 성과
  const splitReturns = (has: boolean) =>
    withReturns.filter((x) => x.j.riskChecks.includes('stopLoss') === has);
  const withStop = splitReturns(true);
  const withoutStop = splitReturns(false);
  const riskCompliance: RiskComplianceStat = {
    withStopLoss: {
      count: all.filter((j) => j.riskChecks.includes('stopLoss')).length,
      avgReturn: avg(withStop.map((x) => x.r)),
    },
    withoutStopLoss: {
      count: all.filter((j) => !j.riskChecks.includes('stopLoss')).length,
      avgReturn: avg(withoutStop.map((x) => x.r)),
    },
  };

  // 월별 추이 (최근 12개월, 데이터 있는 달만)
  const monthMap = new Map<string, { count: number; returns: number[] }>();
  for (const j of all) {
    const key = j.tradedAt.toISOString().slice(0, 7);
    const entry = monthMap.get(key) ?? { count: 0, returns: [] };
    entry.count += 1;
    const r = effectiveReturn(j);
    if (r != null) entry.returns.push(r);
    monthMap.set(key, entry);
  }
  const monthly: MonthlyStat[] = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, v]) => ({ month, count: v.count, avgReturn: avg(v.returns) }));

  // 베스트/워스트 거래
  const highlight = (x: { j: Journal; r: number }): TradeHighlight => ({
    id: x.j.id,
    title: x.j.title,
    ticker: x.j.tickers[0] ?? '',
    returnPct: x.r,
  });
  const sortedByReturn = [...withReturns].sort((a, b) => b.r - a.r);
  const best = sortedByReturn.length ? highlight(sortedByReturn[0]) : null;
  const worst = sortedByReturn.length ? highlight(sortedByReturn[sortedByReturn.length - 1]) : null;

  return {
    total: all.length,
    withReturn: withReturns.length,
    overallWinRate: winRate(allReturns),
    overallAvgReturn: avg(allReturns),
    tickers,
    sentiments,
    tradeTypes,
    riskCompliance,
    monthly,
    best,
    worst,
  };
}
