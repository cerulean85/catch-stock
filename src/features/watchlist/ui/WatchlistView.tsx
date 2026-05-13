'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, PenLine, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/features/locale';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatDateTime,
  formatDecimal,
  formatPercent as formatLocalePercent,
  type LocaleSettings,
} from '@/shared/lib/locale';
import { useWatchlistStore } from '../model/store';
import type { WatchlistItem } from '../model/types';

export function WatchlistView() {
  const { status, result, error, notice, load, add, remove } = useWatchlistStore();
  const locale = useLocale();
  const { t } = locale;
  const [symbol, setSymbol] = useState('');
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!symbol.trim()) return;
    const nextSymbol = symbol.trim().toUpperCase();
    setPendingSymbol(nextSymbol);
    try {
      await add(nextSymbol);
      setSymbol('');
    } catch {
      // The store exposes the error message.
    } finally {
      setPendingSymbol(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Star className="h-4 w-4" />
            Watchlist
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{t('watchlist')}</h2>
        </div>
        {result?.authenticated ? (
          <form onSubmit={onSubmit} className="flex w-full gap-2 sm:w-auto">
            <Input
              value={symbol}
              onChange={(event) => setSymbol(event.target.value.toUpperCase())}
              placeholder="NVDA"
              className="h-9 sm:w-32"
              aria-label={t('watchlistAddLabel')}
            />
            <Button type="submit" size="sm" disabled={pendingSymbol !== null}>
              <Plus className="h-4 w-4" />
              {pendingSymbol ? t('adding') : t('add')}
            </Button>
          </form>
        ) : (
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            {t('loginToSaveWatchlist')}
          </Link>
        )}
      </header>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-md border border-emerald-600/40 bg-emerald-600/5 p-3 text-sm text-emerald-600">
          {notice.symbol} {t(notice.type === 'added' ? 'addedComplete' : 'removedComplete')}
        </div>
      )}

      {status === 'loading' && !result && <LoadingSkeleton />}

      {result && result.items.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {result.items.map((item) => (
            <WatchlistCard
              key={item.symbol}
              item={item}
              locale={locale}
              canRemove={result.authenticated && result.symbols.includes(item.symbol)}
              removing={pendingSymbol === item.symbol}
              onRemove={async () => {
                setPendingSymbol(item.symbol);
                try {
                  await remove(item.symbol);
                } catch {
                  // The store exposes the error message.
                } finally {
                  setPendingSymbol(null);
                }
              }}
            />
          ))}
        </div>
      )}

      {result && result.items.length === 0 && (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('emptyWatchlist')}
        </div>
      )}
    </section>
  );
}

function WatchlistCard({
  item,
  locale,
  canRemove,
  removing,
  onRemove,
}: {
  item: WatchlistItem;
  locale: Pick<LocaleSettings, 'locale' | 'timeZone'> & { t: (key: string) => string };
  canRemove: boolean;
  removing: boolean;
  onRemove: () => Promise<void>;
}) {
  return (
    <article className="rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-lg font-semibold">{item.symbol}</div>
          <div className="truncate text-sm text-muted-foreground">{item.name}</div>
        </div>
        {canRemove && (
          <button
            type="button"
            disabled={removing}
            onClick={() => void onRemove()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`${item.symbol} ${locale.t('clear')}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tabular-nums">
            {item.price == null ? '-' : formatCurrency(item.price, locale)}
          </div>
          <div
            className={cn(
              'font-mono text-sm tabular-nums',
              (item.changePercent ?? 0) > 0 && 'text-emerald-600',
              (item.changePercent ?? 0) < 0 && 'text-rose-600',
              item.changePercent === null && 'text-muted-foreground',
            )}
          >
            {formatPercent(item.changePercent, locale)}
          </div>
        </div>
        <a
          href={item.newsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          News
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md border bg-background px-2 py-1.5">
          <dt className="text-xs text-muted-foreground">Daily RSI</dt>
          <dd className="font-mono tabular-nums">{formatNullable(item.dailyRSI14, locale)}</dd>
        </div>
        <div className="rounded-md border bg-background px-2 py-1.5">
          <dt className="text-xs text-muted-foreground">Monthly RSI</dt>
          <dd className="font-mono tabular-nums">{formatNullable(item.monthlyRSI14, locale)}</dd>
        </div>
      </dl>

      {item.latestNews && (
        <a
          href={item.latestNews.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
        >
          <span className="line-clamp-2 font-medium">{item.latestNews.title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {item.latestNews.publisher}
          </span>
        </a>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        {locale.t('lastJournal')}: {item.lastJournalAt ? formatDateTime(item.lastJournalAt, locale) : '-'}
      </div>

      {item.recentJournals.length > 0 && (
        <div className="mt-3 rounded-md border bg-background px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground">{locale.t('recentJournals')}</div>
          <ul className="mt-1 space-y-1">
            {item.recentJournals.map((journal) => (
              <li key={journal.id}>
                <Link
                  href={`/journal/${journal.id}`}
                  className="line-clamp-1 text-sm hover:underline"
                >
                  {journal.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href={journalHref(item, locale)}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <PenLine className="h-4 w-4" />
        {locale.t('writeJournal')}
      </Link>
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-52 w-full" />
      ))}
    </div>
  );
}

function formatNullable(value: number | null, locale: Pick<LocaleSettings, 'locale'>): string {
  return value == null
    ? '-'
    : formatDecimal(value, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null, locale: Pick<LocaleSettings, 'locale'>): string {
  if (value == null) return '-';
  return formatLocalePercent(value, locale);
}

function journalHref(
  item: WatchlistItem,
  locale: Pick<LocaleSettings, 'locale'> & { t: (key: string) => string },
): string {
  const params = new URLSearchParams();
  params.set('title', `${item.symbol} ${locale.t('watchlistReview')}`);
  params.set('tickers', item.symbol);
  params.set('tags', 'Watchlist');
  params.set(
    'content',
    `## ${locale.t('watchlist')}\n\n- ${item.symbol} ${item.name}\n- ${locale.t('watchlistCurrentPrice')}: ${
      item.price == null ? '-' : formatCurrency(item.price, locale)
    }\n- Daily RSI14: ${formatNullable(item.dailyRSI14, locale)}\n- Monthly RSI14: ${formatNullable(
      item.monthlyRSI14,
      locale,
    )}\n\n## ${locale.t('watchlistReason')}\n\n- \n\n## ${locale.t(
      'watchlistRisk',
    )}\n\n- \n\n## ${locale.t('watchlistNextAction')}\n\n- \n`,
  );
  return `/journal/new?${params.toString()}`;
}
