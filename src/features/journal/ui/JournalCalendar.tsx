'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import { dayKey, groupByDay, monthGridDays, shiftMonth } from '../model/calendar';
import { effectiveReturn } from '../model/metrics';
import type { Journal } from '../model/types';

interface Props {
  month: string;
  items: Journal[];
}

const MAX_PER_DAY = 3;

export function JournalCalendar({ month, items }: Props) {
  const locale = useLocale();
  const { t, timeZone } = locale;
  const router = useRouter();
  const params = useSearchParams();

  const days = monthGridDays(month);
  const byDay = groupByDay(items, timeZone);
  const today = dayKey(new Date(), timeZone);

  const goToMonth = (next: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set('view', 'calendar');
    sp.set('month', next);
    sp.delete('page');
    router.replace(`/journal?${sp.toString()}`);
  };

  const monthLabel = new Intl.DateTimeFormat(locale.locale, {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00.000Z`));

  const weekdayFormat = new Intl.DateTimeFormat(locale.locale, {
    weekday: 'short',
    timeZone: 'UTC',
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label={t('prev')}
            onClick={() => goToMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium tabular-nums">
            {monthLabel}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label={t('next')}
            onClick={() => goToMonth(shiftMonth(month, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => goToMonth(today.slice(0, 7))}
        >
          {t('calendarToday')}
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border">
        {days.slice(0, 7).map((day) => (
          <div
            key={`head-${day}`}
            className="bg-muted/50 py-1.5 text-center text-[11px] font-medium text-muted-foreground"
          >
            {weekdayFormat.format(new Date(`${day}T00:00:00.000Z`))}
          </div>
        ))}
        {days.map((day) => {
          const entries = byDay.get(day) ?? [];
          const inMonth = day.startsWith(month);
          return (
            <div
              key={day}
              className={`min-h-24 bg-background p-1.5 ${inMonth ? '' : 'opacity-40'}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`text-[11px] tabular-nums ${
                    day === today
                      ? 'rounded bg-primary px-1.5 py-0.5 font-medium text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {Number(day.slice(8))}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {entries.slice(0, MAX_PER_DAY).map((journal) => (
                  <DayEntry key={journal.id} journal={journal} draftLabel={t('statusDraft')} />
                ))}
                {entries.length > MAX_PER_DAY && (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{entries.length - MAX_PER_DAY}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayEntry({ journal, draftLabel }: { journal: Journal; draftLabel: string }) {
  const isDraft = journal.status === 'draft';
  const ret = effectiveReturn(journal);
  const tone = isDraft
    ? 'border border-dashed bg-transparent text-muted-foreground'
    : ret == null || ret === 0
      ? 'bg-muted text-foreground/80'
      : ret > 0
        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
        : 'bg-red-500/15 text-red-700 dark:text-red-400';

  return (
    <Link
      href={`/journal/${journal.id}`}
      title={isDraft ? `[${draftLabel}] ${journal.title}` : journal.title}
      className={`truncate rounded px-1 py-0.5 text-[11px] transition-opacity hover:opacity-70 ${tone}`}
    >
      {journal.tickers[0] ? `${journal.tickers[0]} · ` : ''}
      {journal.title}
    </Link>
  );
}
