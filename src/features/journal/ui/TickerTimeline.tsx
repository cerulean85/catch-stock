'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import { formatDateTime, formatNumber as formatLocaleNumber } from '@/shared/lib/locale';
import type { Journal } from '../model/types';
import { computeTradeMetrics } from '../model/metrics';
import { tradeTypeLabel } from '../model/labels';

interface Props {
  symbol: string;
  /** 최신순으로 넘어온 해당 종목 일지. 타임라인은 오래된 순으로 뒤집어 보여준다. */
  journals: Journal[];
}

interface TimelineRow {
  journal: Journal;
  pnlAmount: number | null;
  returnPct: number | null;
  cumulative: number;
}

/** 오래된 순으로 누적 손익을 계산한 뒤 화면 표시는 최신순으로 되돌린다. */
function buildTimeline(journals: Journal[]): { rows: TimelineRow[]; total: number } {
  const rows: TimelineRow[] = [];
  let cumulative = 0;
  for (let i = journals.length - 1; i >= 0; i--) {
    const journal = journals[i];
    const { pnlAmount, returnPct } = computeTradeMetrics(journal);
    if (pnlAmount != null) cumulative += pnlAmount;
    rows.push({ journal, pnlAmount, returnPct, cumulative });
  }
  rows.reverse();
  return { rows, total: cumulative };
}

export function TickerTimeline({ symbol, journals }: Props) {
  const locale = useLocale();
  const { t } = locale;
  const fmt = (n: number) => formatLocaleNumber(Math.round(n * 100) / 100, locale);

  const { rows, total: cumulative } = buildTimeline(journals);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link href="/journal" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' w-fit'}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t('backToList')}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Badge variant="secondary" className="font-mono text-base">
                {symbol}
              </Badge>
              {t('tickerTimeline')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {journals.length} {t('journalCountSuffix')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('cumulativePnl')}</p>
            <p
              className={`text-xl font-semibold tabular-nums ${
                cumulative > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : cumulative < 0
                    ? 'text-red-600 dark:text-red-400'
                    : ''
              }`}
            >
              {fmt(cumulative)}
            </p>
          </div>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
          {t('timelineEmpty')}
        </div>
      ) : (
        <ol className="relative flex flex-col gap-3 border-l pl-5">
          {rows.map(({ journal, pnlAmount, returnPct, cumulative: cum }) => (
            <li key={journal.id} className="relative">
              <span className="absolute -left-[1.4rem] top-2 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground" />
              <Link
                href={`/journal/${journal.id}`}
                className="block rounded-md border bg-card p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{journal.title}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatDateTime(journal.tradedAt, locale)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  {journal.tradeTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-[10px]">
                      {tradeTypeLabel(type, t)}
                    </Badge>
                  ))}
                  {returnPct != null && (
                    <span
                      className={`tabular-nums ${
                        returnPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {fmt(returnPct)}%
                    </span>
                  )}
                  {pnlAmount != null && (
                    <span className="tabular-nums text-muted-foreground">
                      {t('pnlAmount')}: {fmt(pnlAmount)}
                    </span>
                  )}
                  <span className="ml-auto tabular-nums text-muted-foreground">
                    {t('cumulativePnl')}: {fmt(cum)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
