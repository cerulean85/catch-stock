'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, BookX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import { formatDecimal } from '@/shared/lib/locale';
import { winRateGap } from '../model/stats';
import type { PerformanceReport, PerformanceStats, RoundTrip } from '../model/types';
import { StatGrid } from './StatGrid';

export function PerformanceView({ report }: { report: PerformanceReport }) {
  const { t } = useLocale();
  const { overall, byScope, byJournal, roundTrips, openLots } = report;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('performanceTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('performanceDescription')}</p>
        </div>
        <Link href="/account" className={buttonVariants({ variant: 'outline' })}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t('accountBalance')}
        </Link>
      </header>

      {overall.count === 0 ? (
        <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          {t('performanceEmpty')}
        </p>
      ) : (
        <>
          <StatGrid stats={overall} />

          {byScope.length > 1 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium">{t('performanceByScope')}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {byScope.map(({ scope, stats }) => (
                  <div key={scope} className="rounded-md border p-3">
                    <h3 className="text-sm font-medium">
                      {scope === 'domestic' ? t('domesticStocks') : t('overseasStocks')}
                    </h3>
                    <StatGrid stats={stats} compact />
                  </div>
                ))}
              </div>
            </section>
          )}

          <JournalComparison report={report} />

          <RoundTripTable trips={roundTrips} />

          {openLots.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('performanceOpenLots')}:{' '}
              {openLots.map((lot) => `${lot.name || lot.code} ${lot.quantity}`).join(', ')}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t('performanceNote')}</p>
        </>
      )}
      {byJournal.journaled.count + byJournal.unjournaled.count === 0 && null}
    </div>
  );
}

/** 일지를 남긴 매매 vs 그냥 지른 매매. 이 앱만 낼 수 있는 숫자다. */
function JournalComparison({ report }: { report: PerformanceReport }) {
  const { t } = useLocale();
  const locale = useLocale();
  const { journaled, unjournaled } = report.byJournal;
  const gap = winRateGap(report.byJournal);

  if (journaled.count === 0 || unjournaled.count === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{t('performanceByJournal')}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-primary/40 p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-medium">
            <BookOpen className="h-4 w-4" />
            {t('performanceJournaled')}
          </h3>
          <StatGrid stats={journaled} compact />
        </div>
        <div className="rounded-md border p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <BookX className="h-4 w-4" />
            {t('performanceUnjournaled')}
          </h3>
          <StatGrid stats={unjournaled} compact />
        </div>
      </div>
      {gap != null && Math.abs(gap) >= 1 && (
        <p
          className={`text-sm ${gap > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}
        >
          {gap > 0 ? t('performanceGapPositive') : t('performanceGapNegative')}{' '}
          {formatDecimal(Math.abs(gap), locale, { maximumFractionDigits: 1 })}%p
        </p>
      )}
    </section>
  );
}

function RoundTripTable({ trips }: { trips: RoundTrip[] }) {
  const locale = useLocale();
  const { t } = locale;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">
        {t('performanceRoundTrips')} ({trips.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{t('ticker')}</th>
              <th className="py-2 pr-3 text-right font-medium">{t('tradeQty')}</th>
              <th className="py-2 pr-3 text-right font-medium">{t('avgPrice')}</th>
              <th className="py-2 pr-3 text-right font-medium">{t('sellPrice')}</th>
              <th className="py-2 pr-3 text-right font-medium">{t('pnlAmount')}</th>
              <th className="py-2 pr-3 text-right font-medium">{t('computedReturn')}</th>
              <th className="py-2 pr-3 text-right font-medium">{t('performanceHoldingDays')}</th>
              <th className="py-2 font-medium">{t('performanceClosedOn')}</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip, index) => {
              const digits = trip.currency === 'KRW' ? 0 : 2;
              const money = (value: number) =>
                formatDecimal(value, locale, {
                  minimumFractionDigits: digits,
                  maximumFractionDigits: digits,
                });
              const tone =
                trip.pnl > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : trip.pnl < 0
                    ? 'text-red-600 dark:text-red-400'
                    : '';
              return (
                <tr key={`${trip.code}-${trip.closedOn}-${index}`} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{trip.name || trip.code}</span>
                      {trip.journaled && (
                        <Badge variant="outline" className="px-1 py-0 text-[10px]">
                          {t('journal')}
                        </Badge>
                      )}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {formatDecimal(trip.quantity, locale)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{money(trip.buyPrice)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{money(trip.sellPrice)}</td>
                  <td className={`py-2 pr-3 text-right font-medium tabular-nums ${tone}`}>
                    {trip.pnl > 0 ? '+' : ''}
                    {money(trip.pnl)}
                  </td>
                  <td className={`py-2 pr-3 text-right tabular-nums ${tone}`}>
                    {trip.returnPct > 0 ? '+' : ''}
                    {formatDecimal(trip.returnPct, locale, { maximumFractionDigits: 2 })}%
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{trip.holdingDays}</td>
                  <td className="py-2 tabular-nums text-muted-foreground">{trip.closedOn}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export type { PerformanceStats };
