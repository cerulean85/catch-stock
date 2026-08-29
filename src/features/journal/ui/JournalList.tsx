'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, CalendarDays, LayoutGrid, List, Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import {
  DEFAULT_VIEW,
  type JournalFilters,
  type JournalListResult,
  type JournalView,
} from '../model/types';
import { CategoryTabs } from './CategoryTabs';
import { ExportCsvButton } from './ExportCsvButton';
import { JournalCalendar } from './JournalCalendar';
import { JournalCard } from './JournalCard';
import { JournalListFilters } from './JournalListFilters';
import { JournalPagination } from './JournalPagination';
import { JournalRow } from './JournalRow';
import { JournalShortcuts } from './JournalShortcuts';
import { SavedViews } from './SavedViews';

interface Props {
  /** 캘린더 보기에서는 items가 그 달 그리드 전체이고 page/pageCount는 1이다. */
  result: JournalListResult;
  filters: JournalFilters;
  view: JournalView;
  /** 캘린더 보기에서 표시할 'YYYY-MM'. */
  month: string;
}

export function JournalList({ result, filters, view, month }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { items, total, page, pageCount } = result;

  const setView = (next: JournalView) => {
    const sp = new URLSearchParams(params.toString());
    if (next === DEFAULT_VIEW) sp.delete('view');
    else sp.set('view', next);
    sp.delete('page');
    if (next !== 'calendar') sp.delete('month');
    const qs = sp.toString();
    router.replace(qs ? `/journal?${qs}` : '/journal');
  };

  return (
    <div className="flex flex-col gap-6">
      <JournalShortcuts />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('journalTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {total} {t('journalCountSuffix')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <Button
              type="button"
              size="icon"
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              className="h-8 w-8"
              aria-label={t('viewGrid')}
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={view === 'list' ? 'secondary' : 'ghost'}
              className="h-8 w-8"
              aria-label={t('viewList')}
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={view === 'calendar' ? 'secondary' : 'ghost'}
              className="h-8 w-8"
              aria-label={t('viewCalendar')}
              aria-pressed={view === 'calendar'}
              onClick={() => setView('calendar')}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
          <ExportCsvButton filters={filters} disabled={total === 0} />
          <Link href="/journal/stats" className={buttonVariants({ variant: 'outline' })}>
            <BarChart3 className="mr-1.5 h-4 w-4" />
            {t('journalStats')}
          </Link>
          <Link href="/journal/new" className={buttonVariants({ variant: 'default' })}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('newJournal')}
          </Link>
        </div>
      </header>

      <CategoryTabs />

      <JournalListFilters initial={filters} />

      <SavedViews />

      {view === 'calendar' ? (
        <JournalCalendar month={month} items={items} />
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
          {t('journalEmpty')}
        </div>
      ) : (
        <>
          {view === 'list' ? (
            <div className="flex flex-col gap-2">
              {items.map((j) => (
                <JournalRow key={j.id} journal={j} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((j) => (
                <JournalCard key={j.id} journal={j} />
              ))}
            </div>
          )}
          <JournalPagination page={page} pageCount={pageCount} />
        </>
      )}
    </div>
  );
}
