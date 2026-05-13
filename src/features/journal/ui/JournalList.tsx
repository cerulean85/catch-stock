'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import type { Journal, JournalFilters } from '../model/types';
import { JournalCard } from './JournalCard';
import { JournalListFilters } from './JournalListFilters';

interface Props {
  items: Journal[];
  filters: JournalFilters;
}

export function JournalList({ items, filters }: Props) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('journalTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {t('journalCountSuffix')}
          </p>
        </div>
        <Link href="/journal/new" className={buttonVariants({ variant: 'default' })}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('newJournal')}
        </Link>
      </header>

      <JournalListFilters initial={filters} />

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
          {t('journalEmpty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((j) => (
            <JournalCard key={j.id} journal={j} />
          ))}
        </div>
      )}
    </div>
  );
}
