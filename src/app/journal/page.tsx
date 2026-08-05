import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { listJournals, listJournalsInRange } from '@/features/journal/api/server';
import { JournalList } from '@/features/journal';
import { gridRange, monthGridDays, parseMonth } from '@/features/journal/model/calendar';
import {
  JOURNAL_SORTS,
  JOURNAL_VIEWS,
  TRADE_TYPES,
  type JournalFilters,
  type JournalSort,
  type JournalView,
  type TradeType,
} from '@/features/journal/model/types';
import { DEFAULT_TIME_ZONE } from '@/shared/lib/locale';

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
    month?: string;
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

  const view = (JOURNAL_VIEWS as readonly string[]).includes(sp.view ?? '')
    ? (sp.view as JournalView)
    : 'grid';
  // 서버는 사용자의 시간대를 모르므로 기본 달만 기본 시간대로 정한다. 실제 날짜 배치는 클라이언트가 한다.
  const month = parseMonth(sp.month, new Date(), DEFAULT_TIME_ZONE);

  let result;
  if (view === 'calendar') {
    const { from, to } = gridRange(monthGridDays(month));
    const items = await listJournalsInRange(session.user.id, filters, from, to);
    result = { items, total: items.length, page: 1, pageCount: 1 };
  } else {
    result = await listJournals(session.user.id, filters);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <JournalList result={result} filters={filters} view={view} month={month} />
    </div>
  );
}
