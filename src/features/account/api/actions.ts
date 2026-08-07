'use server';

import { and, asc, desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { db } from '@/shared/db/client';
import { accountTrades } from '@/shared/db/schema';
import { listAllJournals } from '@/features/journal/api/server';
import { effectiveReturn } from '@/features/journal/model/metrics';
import { toNumber } from '../model/group';
import type { TickerDetail } from '../model/types';

/**
 * 종목 하나의 체결 내역과 그 종목으로 쓴 일지를 함께 가져온다.
 * 체결은 계좌 단위(수집 서버가 적재)라 유저 구분이 없고, 일지는 로그인한 본인 것만 본다.
 */
export async function getTickerDetailAction(scope: string, code: string): Promise<TickerDetail> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');

  const [tradeRows, journals] = await Promise.all([
    db
      .select()
      .from(accountTrades)
      .where(and(eq(accountTrades.scope, scope), eq(accountTrades.code, code)))
      .orderBy(desc(accountTrades.tradedOn), asc(accountTrades.tradedTime)),
    listAllJournals(userId, { ticker: code }),
  ]);

  return {
    trades: tradeRows.map((row) => ({
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
    })),
    journals: journals.map((journal) => ({
      id: journal.id,
      title: journal.title,
      tradedAt: journal.tradedAt,
      tradeTypes: journal.tradeTypes,
      returnPct: effectiveReturn(journal),
    })),
  };
}
