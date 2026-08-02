import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { listJournals } from '@/features/journal/api/server';
import { JournalList } from '@/features/journal';
import {
  JOURNAL_SORTS,
  TRADE_TYPES,
  type JournalFilters,
  type JournalSort,
  type TradeType,
} from '@/features/journal/model/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '투자 일지 · Catch Stock',
};

interface Props {
  searchParams: Promise<{
    q?: string;
    ticker?: string;
    tag?: string;
    tradeType?: string;
    sort?: string;
    page?: string;
    view?: string;
  }>;
}

export default async function JournalIndexPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const sp = await searchParams;
  const pageNum = Number.parseInt(sp.page ?? '1', 10);
  const filters: JournalFilters = {
    q: sp.q,
    ticker: sp.ticker,
    tag: sp.tag,
    tradeType: (TRADE_TYPES as readonly string[]).includes(sp.tradeType ?? '')
      ? (sp.tradeType as TradeType)
      : undefined,
    sort: (JOURNAL_SORTS as readonly string[]).includes(sp.sort ?? '')
      ? (sp.sort as JournalSort)
      : undefined,
    page: Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1,
  };

  const result = await listJournals(session.user.id, filters);
  const view = sp.view === 'list' ? 'list' : 'grid';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <JournalList result={result} filters={filters} view={view} />
    </div>
  );
}
