import 'server-only';
import { asc, desc } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { accountTrades } from '@/shared/db/schema';
import { toNumber } from '@/features/account/model/group';
import { listAllJournals } from '@/features/journal/api/server';
import { matchRoundTrips, type TradeRow } from '../model/roundtrip';
import { computeStats, splitByJournal } from '../model/stats';
import type { PerformanceReport } from '../model/types';

/**
 * 체결 로그를 매수-매도 짝으로 묶어 실제 성과를 낸다.
 * 체결은 계좌 단위(수집 서버가 적재)라 유저 구분이 없고, 일지는 로그인한 본인 것만 본다.
 */
export async function getPerformance(userId: string): Promise<PerformanceReport> {
  const [rows, journals] = await Promise.all([
    db
      .select()
      .from(accountTrades)
      .orderBy(asc(accountTrades.tradedOn), asc(accountTrades.tradedTime), desc(accountTrades.dealId)),
    listAllJournals(userId),
  ]);

  const trades: TradeRow[] = rows.map((row) => ({
    scope: row.scope === 'overseas' ? 'overseas' : 'domestic',
    code: row.code,
    name: row.name,
    tradedOn: row.tradedOn,
    tradedTime: row.tradedTime,
    dealId: row.dealId,
    side: row.side === 'buy' || row.side === 'sell' ? row.side : 'other',
    sideLabel: row.sideLabel,
    quantity: toNumber(row.quantity),
    price: toNumber(row.price),
    amount: toNumber(row.amount),
    fee: row.fee == null ? null : toNumber(row.fee),
    currency: row.currency,
  }));

  const journaledCodes = new Set(
    journals.flatMap((journal) => journal.tickers.map((ticker) => ticker.toUpperCase())),
  );

  const { roundTrips, openLots } = matchRoundTrips(trades, journaledCodes);

  return {
    roundTrips,
    openLots,
    overall: computeStats(roundTrips),
    byScope: (['domestic', 'overseas'] as const)
      .map((scope) => ({ scope, stats: computeStats(roundTrips.filter((t) => t.scope === scope)) }))
      .filter((entry) => entry.stats.count > 0),
    byJournal: splitByJournal(roundTrips),
  };
}

/** 특정 종목들의 청산 매매를 합쳐 실현손익 요약을 낸다. 회고 화면에서 쓴다. */
export async function getRealizedForTickers(
  userId: string,
  tickers: string[],
): Promise<{ count: number; pnl: number; currency: string; returnPct: number } | null> {
  if (tickers.length === 0) return null;

  const wanted = new Set(tickers.map((ticker) => ticker.toUpperCase()));
  const { roundTrips } = await getPerformance(userId);
  const matched = roundTrips.filter((trip) => wanted.has(trip.code.toUpperCase()));
  if (matched.length === 0) return null;

  // 통화가 섞이면 한 숫자로 못 더한다. 가장 많이 나온 통화만 쓴다.
  const counts = new Map<string, number>();
  for (const trip of matched) counts.set(trip.currency, (counts.get(trip.currency) ?? 0) + 1);
  const currency = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const same = matched.filter((trip) => trip.currency === currency);

  const pnl = same.reduce((sum, trip) => sum + trip.pnl, 0);
  const cost = same.reduce((sum, trip) => sum + trip.quantity * trip.buyPrice, 0);

  return {
    count: same.length,
    pnl,
    currency,
    returnPct: cost === 0 ? 0 : (pnl / cost) * 100,
  };
}
