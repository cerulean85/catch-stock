'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import { formatDateTime } from '@/shared/lib/locale';
import type { Journal } from '../model/types';
import { markReviewedAction } from '../api/actions';

/** 재점검일이 지난 일지 알림. 항목이 없으면 렌더링하지 않는다. */
export function ReviewReminders({ items }: { items: Journal[] }) {
  const locale = useLocale();
  const { t } = locale;
  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
        <CalendarClock className="h-4 w-4" />
        {t('reviewRemindersTitle')} ({items.length})
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((j) => (
          <li
            key={j.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
          >
            <Link href={`/journal/${j.id}`} className="min-w-0 flex-1 truncate hover:underline">
              {j.title}
            </Link>
            <span className="tabular-nums text-xs text-muted-foreground">
              {j.reviewAt ? formatDateTime(j.reviewAt, locale) : ''}
            </span>
            <form action={markReviewedAction.bind(null, j.id)}>
              <Button type="submit" size="sm" variant="outline" className="h-7">
                {t('reviewMarkDone')}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
