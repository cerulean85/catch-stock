'use client';

import { useLocale } from '@/features/locale';
import { formatDecimal } from '@/shared/lib/locale';
import type { PerformanceStats } from '../model/types';

/** 값이 없으면 0으로 속이지 않고 '—'로 둔다. */
function Cell({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export function StatGrid({ stats, compact = false }: { stats: PerformanceStats; compact?: boolean }) {
  const locale = useLocale();
  const { t } = locale;
  const dash = '—';
  const pct = (value: number | null, digits = 1) =>
    value == null ? dash : `${formatDecimal(value, locale, { maximumFractionDigits: digits })}%`;

  const cells = [
    { label: t('performanceCount'), value: `${stats.count}` },
    {
      label: t('performanceWinRate'),
      value: pct(stats.winRate),
      tone:
        stats.winRate == null
          ? ''
          : stats.winRate >= 50
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400',
    },
    {
      label: t('performancePayoff'),
      value:
        stats.payoffRatio == null
          ? dash
          : `${formatDecimal(stats.payoffRatio, locale, { maximumFractionDigits: 2 })}`,
      // 손익비 2 이상이면 승률이 낮아도 남는 구조다.
      tone:
        stats.payoffRatio == null
          ? ''
          : stats.payoffRatio >= 2
            ? 'text-emerald-600 dark:text-emerald-400'
            : '',
    },
    {
      label: t('performanceAvgHold'),
      value:
        stats.avgHoldingDays == null
          ? dash
          : `${formatDecimal(stats.avgHoldingDays, locale, { maximumFractionDigits: 1 })}${t('performanceDays')}`,
    },
    { label: t('performanceAvgWin'), value: pct(stats.avgWin), tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('performanceAvgLoss'), value: pct(stats.avgLoss), tone: 'text-red-600 dark:text-red-400' },
  ];

  return (
    <>
      <div className={`mt-2 grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {(compact ? cells.slice(0, 4) : cells).map((cell) => (
          <Cell key={cell.label} {...cell} />
        ))}
      </div>
      {stats.pnlByCurrency.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
          <span className="text-muted-foreground">{t('performanceRealizedPnl')}</span>
          {stats.pnlByCurrency.map(({ currency, pnl }) => (
            <span
              key={currency}
              className={`font-medium tabular-nums ${
                pnl > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : pnl < 0
                    ? 'text-red-600 dark:text-red-400'
                    : ''
              }`}
            >
              {pnl > 0 ? '+' : ''}
              {formatDecimal(pnl, locale, {
                maximumFractionDigits: currency === 'KRW' ? 0 : 2,
              })}{' '}
              {currency}
            </span>
          ))}
        </p>
      )}
    </>
  );
}
