'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/features/locale';
import { formatDateTime, formatNumber } from '@/shared/lib/locale';
import { effectiveReturn } from '../model/metrics';
import { tradeTypeLabel } from '../model/labels';
import type { Journal } from '../model/types';

export function JournalRow({ journal }: { journal: Journal }) {
  const locale = useLocale();
  const { t } = locale;
  const ret = effectiveReturn(journal);
  const retColor =
    ret == null || ret === 0
      ? 'text-muted-foreground'
      : ret > 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <Link
      href={`/journal/${journal.id}`}
      className="flex items-center gap-3 rounded-md border px-4 py-3 transition-colors hover:bg-muted/30"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{journal.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="tabular-nums">{formatDateTime(journal.tradedAt, locale)}</span>
          {journal.tickers.slice(0, 4).map((ticker) => (
            <span key={ticker} className="font-mono">
              {ticker}
            </span>
          ))}
          {journal.tradeTypes.slice(0, 3).map((type) => (
            <Badge key={type} variant="outline" className="px-1.5 py-0 text-[10px]">
              {tradeTypeLabel(type, t)}
            </Badge>
          ))}
        </div>
      </div>
      {ret != null && (
        <span className={`shrink-0 text-sm font-medium tabular-nums ${retColor}`}>
          {formatNumber(Math.round(ret * 100) / 100, locale)}%
        </span>
      )}
    </Link>
  );
}
