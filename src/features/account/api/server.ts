import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { accountHoldings, accountSyncs } from '@/shared/db/schema';
import { toGroup, toNumber } from '../model/group';
import type { AccountBalance, Holding, SyncStatus } from '../model/types';

const SYNC_ID = 'kiwoom';

type HoldingRow = typeof accountHoldings.$inferSelect;

function toHolding(row: HoldingRow): Holding {
  return {
    scope: row.scope === 'overseas' ? 'overseas' : 'domestic',
    code: row.code,
    name: row.name,
    quantity: toNumber(row.quantity),
    avgPrice: toNumber(row.avgPrice),
    currentPrice: toNumber(row.currentPrice),
    evalAmount: toNumber(row.evalAmount),
    pnlAmount: toNumber(row.pnlAmount),
    pnlRate: toNumber(row.pnlRate),
    currency: row.currency,
    evalAmountKrw: row.evalAmountKrw == null ? null : toNumber(row.evalAmountKrw),
  };
}

/**
 * 잔고는 수집 서버(trade/sync.py)가 적재한 스냅샷을 읽기만 한다.
 * 키움 API는 호출 IP 등록이 필요해 웹에서 직접 부르지 않는다.
 */
export async function getAccountBalance(): Promise<AccountBalance> {
  const [rows, syncRows] = await Promise.all([
    db.select().from(accountHoldings).orderBy(asc(accountHoldings.scope), asc(accountHoldings.code)),
    db.select().from(accountSyncs).where(eq(accountSyncs.id, SYNC_ID)).limit(1),
  ]);

  const holdings = rows.map(toHolding);
  const syncRow = syncRows[0];
  const sync: SyncStatus | null = syncRow
    ? {
        status: syncRow.status === 'error' ? 'error' : 'ok',
        message: syncRow.message,
        publicIp: syncRow.publicIp,
        syncedAt: syncRow.syncedAt,
      }
    : null;

  return {
    domestic: toGroup(
      holdings.filter((h) => h.scope === 'domestic'),
      'KRW',
    ),
    overseas: toGroup(
      holdings.filter((h) => h.scope === 'overseas'),
      'USD',
    ),
    sync,
  };
}
