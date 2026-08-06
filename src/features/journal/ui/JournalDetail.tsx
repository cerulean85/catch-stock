'use client';

import Link from 'next/link';
import { CalendarClock, Copy, Download, Link2, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLocale } from '@/features/locale';
import {
  formatDateTime,
  formatNumber as formatLocaleNumber,
  type LocaleSettings,
} from '@/shared/lib/locale';
import { type Journal } from '../model/types';
import { horizonLabel, riskCheckLabel, sentimentLabel, tradeTypeLabel } from '../model/labels';
import { computeTradeMetrics } from '../model/metrics';
import { journalToMarkdown, slugifyTitle } from '../model/export';
import { cloneJournalAction, markReviewedAction } from '../api/actions';
import { DeleteJournalButton } from './DeleteJournalButton';
import { downloadText } from './download';
import { MarkdownPreview } from './MarkdownPreview';

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000);
}

function formatNumber(s: string | null, locale: Pick<LocaleSettings, 'locale'>): string | null {
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? formatLocaleNumber(n, locale) : s;
}

export function JournalDetail({
  journal,
  linked = null,
}: {
  journal: Journal;
  linked?: Journal | null;
}) {
  const locale = useLocale();
  const { t } = locale;
  const trade = {
    qty: formatNumber(journal.tradeQty, locale),
    price: formatNumber(journal.tradePrice, locale),
    sell: formatNumber(journal.sellPrice, locale),
    fee: formatNumber(journal.tradeFee, locale),
    target: formatNumber(journal.targetReturn, locale),
    actual: formatNumber(journal.actualReturn, locale),
  };
  const hasTrade = Object.values(trade).some((v) => v != null);
  const metrics = computeTradeMetrics(journal);
  const fmt = (n: number | null) =>
    n == null ? null : formatLocaleNumber(Math.round(n * 100) / 100, locale);

  const reviewDue =
    journal.reviewAt != null && journal.reviewedAt == null && journal.reviewAt <= new Date();

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {journal.status === 'draft' && (
              <Badge
                variant="outline"
                className="mr-2 align-middle text-xs text-amber-600 dark:text-amber-400"
              >
                {t('statusDraft')}
              </Badge>
            )}
            {journal.title}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadText(
                  `${slugifyTitle(journal.title)}.md`,
                  journalToMarkdown(journal),
                  'text/markdown',
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> {t('exportMarkdown')}
            </Button>
            <Link
              href={`/journal/${journal.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <Pencil className="mr-2 h-4 w-4" /> {t('edit')}
            </Link>
            <form action={cloneJournalAction.bind(null, journal.id)}>
              <Button type="submit" variant="outline">
                <Copy className="mr-2 h-4 w-4" /> {t('cloneJournal')}
              </Button>
            </form>
            <DeleteJournalButton id={journal.id} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatDateTime(journal.tradedAt, locale)}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {journal.tickers.map((ticker) => (
            <Link key={ticker} href={`/journal/ticker/${encodeURIComponent(ticker)}`}>
              <Badge
                variant="secondary"
                className="font-mono transition-colors hover:bg-secondary/70"
              >
                {ticker}
              </Badge>
            </Link>
          ))}
          {journal.tradeTypes.map((type) => (
            <Badge key={type} variant="outline">
              {tradeTypeLabel(type, t)}
            </Badge>
          ))}
          {journal.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>
        {(journal.sentiment != null || journal.horizon) && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {journal.sentiment != null && (
              <span>
                {t('sentiment')}: {sentimentLabel(journal.sentiment, t)}
              </span>
            )}
            {journal.horizon && (
              <span>
                {t('horizon')}: {horizonLabel(journal.horizon, t)}
              </span>
            )}
          </div>
        )}
      </header>

      {(reviewDue || (journal.reviewAt != null && journal.reviewedAt == null)) && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
          <span className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            {reviewDue ? (
              <span className="font-medium text-amber-700 dark:text-amber-300">
                {t('reviewDue')}
              </span>
            ) : (
              <span className="text-muted-foreground">{t('reviewScheduled')}</span>
            )}
            <span className="tabular-nums text-muted-foreground">
              {formatDateTime(journal.reviewAt!, locale)}
            </span>
          </span>
          <form action={markReviewedAction.bind(null, journal.id)}>
            <Button type="submit" size="sm" variant="outline">
              {t('reviewMarkDone')}
            </Button>
          </form>
        </section>
      )}

      {linked && <LinkedTradeCard journal={journal} linked={linked} />}

      {hasTrade && (
        <section className="grid grid-cols-2 gap-3 rounded-md border bg-card p-4 sm:grid-cols-3">
          <Cell label={t('tradeQty')} value={trade.qty} />
          <Cell label={t('tradePrice')} value={trade.price} />
          <Cell label={t('sellPrice')} value={trade.sell} />
          <Cell label={t('fee')} value={trade.fee} />
          <Cell label={t('targetReturn')} value={trade.target} />
          <Cell label={t('actualReturn')} value={trade.actual} />
          {(metrics.totalCost != null ||
            metrics.returnPct != null ||
            metrics.pnlAmount != null) && (
            <div className="col-span-2 flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-sm sm:col-span-3">
              <Metric label={t('totalCost')} value={fmt(metrics.totalCost)} />
              <Metric
                label={t('computedReturn')}
                value={metrics.returnPct == null ? null : `${fmt(metrics.returnPct)}%`}
                tone={metrics.returnPct}
              />
              <Metric label={t('pnlAmount')} value={fmt(metrics.pnlAmount)} tone={metrics.pnlAmount} />
            </div>
          )}
        </section>
      )}

      {journal.riskChecks.length > 0 && (
        <section className="rounded-md border bg-card p-4">
          <h2 className="text-sm font-medium">{t('riskChecklist')}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {journal.riskChecks.map((check) => (
              <li key={check} className="rounded-md border bg-background px-3 py-2 text-sm">
                {riskCheckLabel(check, t)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Separator />

      <MarkdownPreview content={journal.content} />
    </article>
  );
}

function LinkedTradeCard({ journal, linked }: { journal: Journal; linked: Journal }) {
  const locale = useLocale();
  const { t } = locale;
  const buy = Number(linked.tradePrice);
  const sell = Number(journal.sellPrice ?? journal.tradePrice);
  const returnPct =
    Number.isFinite(buy) && buy !== 0 && Number.isFinite(sell)
      ? ((sell - buy) / buy) * 100
      : null;
  const holdDays = daysBetween(linked.tradedAt, journal.tradedAt);
  const returnColor =
    returnPct == null || returnPct === 0
      ? ''
      : returnPct > 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <section className="rounded-md border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="h-4 w-4" /> {t('linkedTrade')}
      </h2>
      <Link
        href={`/journal/${linked.id}`}
        className="mt-2 block truncate text-sm text-primary hover:underline"
      >
        {linked.title}
      </Link>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{t('holdingPeriod')}</span>
          <span className="font-medium tabular-nums">
            {holdDays}
            {t('daysSuffix')}
          </span>
        </span>
        {returnPct != null && (
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t('computedReturn')}</span>
            <span className={`font-medium tabular-nums ${returnColor}`}>
              {formatLocaleNumber(Math.round(returnPct * 100) / 100, locale)}%
            </span>
          </span>
        )}
      </div>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums">{value ?? '—'}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null;
  tone?: number | null;
}) {
  const color =
    tone == null || tone === 0
      ? ''
      : tone > 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400';
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${color}`}>{value ?? '—'}</span>
    </span>
  );
}
