'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/features/locale';
import { formatDateTime } from '@/shared/lib/locale';
import { useScreenerStore } from '../model/store';
import { ScreenerGrid } from './ScreenerGrid';

export function ScreenerView() {
  const { status, result, error, load } = useScreenerStore();
  const locale = useLocale();
  const { t } = locale;

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catch Stock</h1>
          <p className="text-sm text-muted-foreground">
            {t('stockScreenerDescription')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {t('savedAt')}: {formatDateTime(result.generatedAt, locale)} ·{' '}
              {result.cache.hit ? `${t('cache')} (${result.cache.ttlSeconds}s)` : t('fresh')}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={status === 'loading'}
            onClick={() => void load({ refresh: true })}
          >
            {status === 'loading' ? t('refreshing') : t('refresh')}
          </Button>
        </div>
      </header>

      {status === 'error' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="font-medium">{t('failedLoad')}</div>
          <div className="mt-1">{error}</div>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={() => void load({ refresh: true })}
          >
            {t('retry')}
          </Button>
        </div>
      )}

      {status === 'loading' && !result && <LoadingSkeleton />}

      {result && <ScreenerGrid items={result.items} locale={locale} />}

      {result && result.skipped.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            {t('skippedSymbols')} {result.skipped.length}
          </summary>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
            {result.skipped.map((s) => (
              <li key={s.symbol} className="font-mono">
                {s.symbol} <span className="text-muted-foreground">({s.reason})</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
