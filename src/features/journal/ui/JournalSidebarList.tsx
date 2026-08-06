'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import { formatDateTime } from '@/shared/lib/locale';
import type { Journal } from '../model/types';

/** 상세 페이지 우측에 붙는 일지 목록. 현재 보고 있는 일지를 강조한다. */
export function JournalSidebarList({
  items,
  currentId,
}: {
  items: Journal[];
  currentId: string;
}) {
  const locale = useLocale();
  const { t } = locale;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Link href="/journal" className="text-sm font-medium hover:underline">
          {t('journalTitle')}
        </Link>
        <Link
          href="/journal/new"
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          aria-label={t('newJournal')}
        >
          <Plus className="h-4 w-4" />
        </Link>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((j) => {
          const active = j.id === currentId;
          return (
            <Link
              key={j.id}
              href={`/journal/${j.id}`}
              aria-current={active ? 'page' : undefined}
              className={
                'rounded-md border px-3 py-2 text-sm transition-colors ' +
                (active
                  ? 'border-primary/50 bg-muted font-medium'
                  : 'border-transparent hover:bg-muted/40')
              }
            >
              <p className="truncate">
                {j.status === 'draft' && (
                  <Badge
                    variant="outline"
                    className="mr-1.5 px-1.5 py-0 align-middle text-[10px] text-amber-600 dark:text-amber-400"
                  >
                    {t('statusDraft')}
                  </Badge>
                )}
                {j.title}
              </p>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground tabular-nums">
                {formatDateTime(j.tradedAt, locale)}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
