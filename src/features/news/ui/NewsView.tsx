'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CalendarDays, ExternalLink, Newspaper, PenLine, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/features/locale';
import { cn } from '@/lib/utils';
import {
  formatDateTime,
  formatDecimal,
  formatPercent,
  formatRelativeTime,
  type LocaleSettings,
} from '@/shared/lib/locale';
import { useNewsStore } from '../model/store';
import type { MarketIndicator, MarketNewsItem } from '../model/types';

export function NewsView() {
  const { status, result, error, load } = useNewsStore();
  const locale = useLocale();
  const { t } = locale;

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Newspaper className="h-4 w-4" />
            {t('todaysMarketBrief')}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{t('topMarketNews')}</h2>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {t('savedAt')}: {formatDateTime(result.generatedAt, locale)} ·{' '}
              {result.cache.hit
                ? `${t('cache')} (${result.cache.ttlSeconds}s)`
                : t('fresh')}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={status === 'loading'}
            onClick={() => void load({ refresh: true })}
          >
            <RefreshCw className={cn('h-4 w-4', status === 'loading' && 'animate-spin')} />
            {t('refresh')}
          </Button>
        </div>
      </header>

      {status === 'error' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="font-medium">{t('failedNewsLoad')}</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      {status === 'loading' && !result && <LoadingSkeleton />}

      {result && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-4">
            <MarketSummary indicators={result.indicators} locale={locale} />
            <div className="grid gap-3 sm:grid-cols-2">
              {result.items.map((item) => (
                <NewsCard key={item.id} item={item} locale={locale} />
              ))}
            </div>
            <MarketChecklist indicators={result.indicators} locale={locale} />
          </div>

          <aside className="flex flex-col gap-4">
            <IndicatorList
              title={t('marketIndicators')}
              indicators={result.indicators.filter((indicator) => indicator.group === 'market')}
              locale={locale}
            />
            <IndicatorList
              title={t('sectorEtf')}
              indicators={result.indicators.filter((indicator) => indicator.group === 'sector')}
              locale={locale}
            />
            <section className="rounded-md border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4" />
                {t('economicEvents')}
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {result.calendarLinks.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-md px-2 py-2 transition-colors hover:bg-accent"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        {calendarTitle(link.url, t)}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {calendarDescription(link.url, t)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}

function NewsCard({
  item,
  locale,
}: {
  item: MarketNewsItem;
  locale: { locale: string; t: (key: string) => string };
}) {
  const { t } = locale;
  return (
    <article className="grid min-h-36 grid-cols-[minmax(0,1fr)_5.5rem] gap-3 rounded-md border bg-card p-4 transition-colors hover:bg-accent">
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{item.topic}</span>
          <span aria-hidden="true">/</span>
          <span>{formatRelativeTime(item.publishedAt, locale)}</span>
        </div>
        <a href={item.url} target="_blank" rel="noreferrer" className="group">
          <h3 className="mt-2 line-clamp-3 text-sm font-semibold leading-5 group-hover:underline">
            {item.title}
          </h3>
        </a>
        <div className="mt-auto flex min-w-0 items-center gap-2 pt-3 text-xs text-muted-foreground">
          <span className="truncate">{item.publisher}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {item.relatedTickers.slice(0, 3).map((ticker) => (
            <span key={ticker} className="rounded border px-1.5 py-0.5 font-mono text-[11px]">
              {ticker}
            </span>
          ))}
          <Link
            href={journalHref({
              title: `${item.topic}: ${item.title}`,
              tags: [item.topic, 'News'],
              content: `## ${t('journalNews')}\n\n[${item.title}](${item.url})\n\n## ${t('journalNewsPoints')}\n\n- \n\n## ${t('journalDecision')}\n\n- \n`,
            })}
            className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <PenLine className="h-3 w-3" />
            {t('journal')}
          </Link>
        </div>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="overflow-hidden rounded-md border bg-background"
        aria-label={item.title}
      >
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Newspaper className="h-5 w-5" />
          </div>
        )}
      </a>
    </article>
  );
}

function MarketSummary({
  indicators,
  locale,
}: {
  indicators: MarketIndicator[];
  locale: Pick<LocaleSettings, 'locale'> & { t?: (key: string) => string };
}) {
  const t = 't' in locale && typeof locale.t === 'function' ? locale.t : (key: string) => key;
  const market = indicators.filter((indicator) => indicator.group === 'market');
  const sp500 = market.find((indicator) => indicator.symbol === '^GSPC');
  const nasdaq = market.find((indicator) => indicator.symbol === '^IXIC');
  const tenYear = market.find((indicator) => indicator.symbol === '^TNX');
  const oil = market.find((indicator) => indicator.symbol === 'CL=F');
  const parts = [
    describeMove('S&P 500', sp500?.changePercent ?? null, locale),
    describeMove('Nasdaq', nasdaq?.changePercent ?? null, locale),
    describeMove('10Y', tenYear?.changePercent ?? null, locale),
    describeMove('WTI', oil?.changePercent ?? null, locale),
  ].filter(Boolean);

  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="text-xs font-medium text-muted-foreground">{t('marketPulse')}</div>
      <div className="mt-1 text-sm font-medium">{parts.join(' / ') || t('marketWaiting')}</div>
    </div>
  );
}

function IndicatorList({
  title,
  indicators,
  locale,
}: {
  title: string;
  indicators: MarketIndicator[];
  locale: Pick<LocaleSettings, 'locale'> & { t?: (key: string) => string };
}) {
  const t = locale.t ?? ((key: string) => key);
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="text-sm font-medium">{title}</div>
      <ul className="mt-3 divide-y text-sm">
        {indicators.map((indicator) => (
          <li key={indicator.symbol} className="py-1 first:pt-0">
            <div className="group flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent">
              <a
                href={indicator.newsUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1"
              >
                <div className="font-medium text-foreground">{indicator.label}</div>
                <div className="font-mono text-xs text-muted-foreground">{indicator.symbol}</div>
              </a>
              <a
                href={indicator.newsUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-right"
              >
                <div className="font-mono tabular-nums">{formatMarketValue(indicator, locale)}</div>
                <div
                  className={cn(
                    'font-mono text-xs tabular-nums',
                    (indicator.changePercent ?? 0) > 0 && 'text-emerald-600',
                    (indicator.changePercent ?? 0) < 0 && 'text-rose-600',
                    indicator.changePercent === null && 'text-muted-foreground',
                  )}
                >
                  {formatChangePercent(indicator.changePercent, locale)}
                </div>
              </a>
              <Link
                href={journalHref({
                  title: `${indicator.label} ${t('journal')}`,
                  tickers: [indicator.symbol],
                  tags: [title, indicator.label],
                  content: `## ${t('journalIndicator')}\n\n- ${indicator.label} (${indicator.symbol})\n- ${formatMarketValue(indicator, locale)}\n- ${formatChangePercent(indicator.changePercent, locale)}\n\n## ${t('journalInterpretation')}\n\n- \n\n## ${t('journalDecision')}\n\n- \n`,
                })}
                className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground group-hover:flex"
                aria-label={`${indicator.label} ${t('journal')}`}
              >
                <PenLine className="h-3.5 w-3.5" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MarketChecklist({
  indicators,
  locale,
}: {
  indicators: MarketIndicator[];
  locale: Pick<LocaleSettings, 'locale'> & { t?: (key: string) => string };
}) {
  const t = locale.t ?? ((key: string) => key);
  const market = indicators.filter((indicator) => indicator.group === 'market');
  const sectors = indicators.filter((indicator) => indicator.group === 'sector');
  const strongestSector = [...sectors].sort(
    (a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity),
  )[0];
  const weakestSector = [...sectors].sort(
    (a, b) => (a.changePercent ?? Infinity) - (b.changePercent ?? Infinity),
  )[0];
  const sp500 = market.find((indicator) => indicator.symbol === '^GSPC');
  const nasdaq = market.find((indicator) => indicator.symbol === '^IXIC');
  const tenYear = market.find((indicator) => indicator.symbol === '^TNX');
  const oil = market.find((indicator) => indicator.symbol === 'CL=F');
  const checklist = [
    {
      label: t('marketBreadth'),
      value:
        sp500 && nasdaq
          ? `S&P 500 ${formatChangePercent(sp500.changePercent, locale)}, Nasdaq ${formatChangePercent(
              nasdaq.changePercent,
              locale,
            )}`
          : t('noIndexData'),
    },
    {
      label: t('ratePressure'),
      value: tenYear
        ? `10Y Yield ${formatMarketValue(tenYear, locale)} (${formatChangePercent(
            tenYear.changePercent,
            locale,
          )})`
        : t('noRateData'),
    },
    {
      label: t('commodity'),
      value: oil
        ? `WTI ${formatMarketValue(oil, locale)} (${formatChangePercent(oil.changePercent, locale)})`
        : t('noCommodityData'),
    },
    {
      label: t('sectorRotation'),
      value:
        strongestSector && weakestSector
          ? `${strongestSector.label} ${t('sectorStrong')} / ${weakestSector.label} ${t('sectorWeak')}`
          : t('noSectorData'),
    },
  ];

  return (
    <section className="grid gap-3 rounded-md border bg-card p-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <div className="text-sm font-medium">{t('todayChecklist')}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('todayChecklistDescription')}
        </p>
      </div>
      {checklist.map((item) => (
        <div key={item.label} className="rounded-md border bg-background px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
          <div className="mt-1 text-sm font-medium">{item.value}</div>
        </div>
      ))}
    </section>
  );
}

function describeMove(
  label: string,
  value: number | null,
  locale: Pick<LocaleSettings, 'locale'> & { t?: (key: string) => string },
): string | null {
  const t = locale.t ?? ((key: string) => key);
  if (value === null) return null;
  if (Math.abs(value) < 0.05) return `${label} ${t('moveFlat')}`;
  return `${label} ${value > 0 ? t('moveUp') : t('moveDown')} ${formatPercent(Math.abs(value), locale)}`;
}

function journalHref({
  title,
  tickers = [],
  tags,
  content,
}: {
  title: string;
  tickers?: string[];
  tags: string[];
  content: string;
}): string {
  const params = new URLSearchParams();
  params.set('title', title.slice(0, 120));
  if (tickers.length > 0) params.set('tickers', tickers.join(','));
  params.set('tags', tags.join(','));
  params.set('content', content);
  return `/journal/new?${params.toString()}`;
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-full" />
      ))}
    </div>
  );
}

function calendarTitle(url: string, t: (key: string) => string): string {
  return url.includes('/earnings/') ? t('earningsCalendar') : t('economicCalendar');
}

function calendarDescription(url: string, t: (key: string) => string): string {
  return url.includes('/earnings/')
    ? t('earningsCalendarDescription')
    : t('economicCalendarDescription');
}

function formatMarketValue(indicator: MarketIndicator, locale: Pick<LocaleSettings, 'locale'>): string {
  if (indicator.value === null) return '-';
  return formatDecimal(indicator.value, locale, {
    maximumFractionDigits: indicator.symbol === '^TNX' ? 2 : 2,
    minimumFractionDigits: indicator.symbol === '^TNX' ? 2 : 0,
  });
}

function formatChangePercent(value: number | null, locale: Pick<LocaleSettings, 'locale'>): string {
  if (value === null) return '-';
  return formatPercent(value, locale);
}
