import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { listJournals } from '@/features/journal/api/server';
import { JournalList } from '@/features/journal';
import type { JournalFilters, TradeType } from '@/features/journal/model/types';
import { TRADE_TYPES } from '@/features/journal/model/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '투자 일지 · Catch Stock',
};

interface Props {
  searchParams: Promise<{ q?: string; ticker?: string; tag?: string; tradeType?: string }>;
}

export default async function JournalIndexPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const sp = await searchParams;
  const filters: JournalFilters = {
    q: sp.q,
    ticker: sp.ticker,
    tag: sp.tag,
    tradeType: (TRADE_TYPES as readonly string[]).includes(sp.tradeType ?? '')
      ? (sp.tradeType as TradeType)
      : undefined,
  };

  const items = await listJournals(session.user.id, filters);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <JournalList items={items} filters={filters} />
    </div>
  );
}
