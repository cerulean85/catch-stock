import 'server-only';
import { and, eq, gte, ilike, isNull, lt, lte, ne, or, sql, type SQL } from 'drizzle-orm';
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
    status: row.status as Journal['status'],
    category: row.category as Journal['category'],
    pinned: row.pinned,
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
    linkedJournalId: row.linkedJournalId,
    reviewAt: row.reviewAt,
    reviewedAt: row.reviewedAt,
    processScore: row.processScore,
    reviewNote: row.reviewNote,
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
    status: input.status,
    category: input.category,
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
    linkedJournalId: input.linkedJournalId,
    reviewAt: input.reviewAt,
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
  if (filters.category) {
    conditions.push(eq(journals.category, filters.category));
  }
  if (filters.status) {
    conditions.push(eq(journals.status, filters.status));
  }
  return conditions;
}

// COALESCE(청산가 기반 계산 수익률, 수동 actualReturn) — sort=return에서 DB 정렬용.
const returnSqlExpr = sql`COALESCE(CASE WHEN ${journals.sellPrice} IS NOT NULL AND ${journals.tradePrice} IS NOT NULL AND ${journals.tradePrice} <> 0 THEN (${journals.sellPrice} - ${journals.tradePrice}) / ${journals.tradePrice} * 100 ELSE NULL END, ${journals.actualReturn})`;

function orderBySql(sort: JournalSort): SQL[] {
  // 고정한 일지는 어떤 정렬을 고르든, 몇 페이지를 보든 맨 위에 온다.
  const pinnedFirst = sql`${journals.pinned} DESC`;

  if (sort === 'oldest') {
    return [pinnedFirst, sql`${journals.tradedAt} ASC`];
  }
  if (sort === 'sentiment') {
    return [pinnedFirst, sql`${journals.sentiment} DESC NULLS LAST`, sql`${journals.tradedAt} DESC`];
  }
  if (sort === 'return') {
    return [pinnedFirst, sql`${returnSqlExpr} DESC NULLS LAST`, sql`${journals.tradedAt} DESC`];
  }
  return [pinnedFirst, sql`${journals.tradedAt} DESC`];
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
  // 재점검일이 새로 바뀌면 이전 '검토 완료' 표시는 무효로 본다.
  const reviewChanged =
    input.reviewAt?.getTime() !== (existing.reviewAt?.getTime() ?? undefined);
  const setValues = reviewChanged ? { ...values, reviewedAt: null } : values;
  const updated = await db
    .update(journals)
    .set(setValues)
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

/** 자동완성용: 사용자가 이전에 쓴 티커·태그를 빈도 높은 순으로 반환. */
export async function getTickerTagSuggestions(
  userId: string,
): Promise<{ tickers: string[]; tags: string[] }> {
  const all = await listAllJournals(userId, {});
  const ranked = (pick: (j: Journal) => string[]): string[] => {
    const counts = new Map<string, number>();
    for (const j of all) for (const v of pick(j)) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([v]) => v);
  };
  return { tickers: ranked((j) => j.tickers), tags: ranked((j) => j.tags) };
}

/** 재점검일이 지났는데 아직 검토 완료 표시가 안 된 일지. */
export async function listDueReviews(userId: string, now: Date): Promise<Journal[]> {
  const rows = await db
    .select()
    .from(journals)
    .where(
      and(
        eq(journals.userId, userId),
        isNull(journals.reviewedAt),
        lte(journals.reviewAt, now),
      ),
    )
    .orderBy(sql`${journals.reviewAt} ASC`);
  return rows.map(toJournal);
}

/** 일지를 '검토 완료'로 표시. */
export async function markJournalReviewed(
  userId: string,
  id: string,
  reviewedAt: Date,
): Promise<boolean> {
  const res = await db
    .update(journals)
    .set({ reviewedAt })
    .where(and(eq(journals.id, id), eq(journals.userId, userId)))
    .returning({ id: journals.id });
  return res.length > 0;
}

/** 매도 일지를 연결할 후보(발행된 일지, 자기 자신 제외). 최신순. */
export async function listLinkCandidates(
  userId: string,
  excludeId?: string,
): Promise<Journal[]> {
  const conds: SQL[] = [eq(journals.userId, userId), eq(journals.status, 'published')];
  if (excludeId) conds.push(ne(journals.id, excludeId));
  const rows = await db
    .select()
    .from(journals)
    .where(and(...conds))
    .orderBy(sql`${journals.tradedAt} DESC`)
    .limit(100);
  return rows.map(toJournal);
}

function avg(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function winRate(returns: number[]): number | null {
  return returns.length ? returns.filter((r) => r > 0).length / returns.length : null;
}

export async function getJournalStats(userId: string): Promise<JournalStats> {
  // 초안은 아직 확정되지 않은 기록이라 통계에서 제외한다.
  const all = await listAllJournals(userId, { status: 'published' });

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

/** 일지 고정 여부를 바꾼다. 없는 일지거나 남의 일지면 false. */
export async function setJournalPinned(
  userId: string,
  id: string,
  pinned: boolean,
): Promise<boolean> {
  const res = await db
    .update(journals)
    .set({ pinned })
    .where(and(eq(journals.id, id), eq(journals.userId, userId)))
    .returning({ id: journals.id });
  return res.length > 0;
}

/** 회고 채점 저장. 과정 점수와 메모를 남기고 검토 완료로 표시한다. */
export async function saveJournalReview(
  userId: string,
  id: string,
  input: { processScore: number; reviewNote: string; reviewedAt: Date },
): Promise<boolean> {
  const res = await db
    .update(journals)
    .set({
      processScore: input.processScore,
      reviewNote: input.reviewNote || null,
      reviewedAt: input.reviewedAt,
    })
    .where(and(eq(journals.id, id), eq(journals.userId, userId)))
    .returning({ id: journals.id });
  return res.length > 0;
}
