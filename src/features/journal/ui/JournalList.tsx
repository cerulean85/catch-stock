'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, LayoutGrid, List, Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import type { JournalFilters, JournalListResult, JournalView } from '../model/types';
import { ExportCsvButton } from './ExportCsvButton';
import { JournalCard } from './JournalCard';
import { JournalListFilters } from './JournalListFilters';
import { JournalPagination } from './JournalPagination';
import { JournalRow } from './JournalRow';

interface Props {
  result: JournalListResult;
  filters: JournalFilters;
  view: JournalView;
}

export function JournalList({ result, filters, view }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const { items, total, page, pageCount } = result;

  const setView = (next: JournalView) => {
    const sp = new URLSearchParams(params.toString());
    if (next === 'grid') sp.delete('view');
    else sp.set('view', next);
    const qs = sp.toString();
    router.replace(qs ? `/journal?${qs}` : '/journal');
  };

  return (
    <div className="flex flex-col gap-6">
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

      <JournalListFilters initial={filters} />

      {items.length === 0 ? (
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
