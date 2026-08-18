'use client';

import { AlertTriangle, PieChart } from 'lucide-react';
import { useLocale } from '@/features/locale';
import { formatDecimal } from '@/shared/lib/locale';
import type { Exposure, PortfolioSummary, Weight } from '../model/summary';

/** 보유 종목을 합쳐 쏠림과 노출을 한눈에 보여준다. 개별 나열은 아래 표가 맡는다. */
export function PortfolioSummaryCard({ summary }: { summary: PortfolioSummary }) {
  const locale = useLocale();
  const { t } = locale;

  if (summary.weights.length === 0) return null;

  const krw = (value: number) => formatDecimal(value, locale, { maximumFractionDigits: 0 });
  const pct = (value: number) => formatDecimal(value, locale, { maximumFractionDigits: 1 });

  return (
    <section className="rounded-lg border p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <PieChart className="h-4 w-4" />
          {t('portfolioTitle')}
        </h2>
        <p className="text-sm tabular-nums">
          <span className="text-muted-foreground">{t('totalEvalAmount')} </span>
          <span className="font-semibold">{krw(summary.totalKrw)} KRW</span>
          <span
            className={`ml-2 ${
              summary.totalPnlKrw > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : summary.totalPnlKrw < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'
            }`}
          >
            {summary.totalPnlKrw > 0 ? '+' : ''}
            {krw(summary.totalPnlKrw)}
          </span>
        </p>
      </header>

      {summary.warnings.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {summary.warnings.map((warning) => (
            <li
              key={warning.key}
              className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {warning.detail ? `${warning.detail} — ` : ''}
                {t(warning.key)} {pct(warning.value)}%
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('portfolioConcentration')}
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {summary.weights.slice(0, 6).map((weight) => (
              <WeightBar key={`${weight.scope}-${weight.code}`} weight={weight} />
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <ExposureList title={t('portfolioByScope')} items={summary.byScope} translate />
          <ExposureList title={t('portfolioByCurrency')} items={summary.byCurrency} />
          <div>
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t('portfolioPnlSplit')}
            </h3>
            <p className="mt-1.5 text-sm tabular-nums">
              <span className="text-emerald-600 dark:text-emerald-400">
                {t('portfolioWinners')} {pct(summary.winnerWeightPct)}%
              </span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-red-600 dark:text-red-400">
                {t('portfolioLosers')} {pct(summary.loserWeightPct)}%
              </span>
            </p>
          </div>
        </div>
      </div>

      {summary.unconvertible.length > 0 && (
        <p className="mt-3 text-xs text-amber-600">
          {t('portfolioUnconvertible')}: {summary.unconvertible.join(', ')}
        </p>
      )}
    </section>
  );
}

function WeightBar({ weight }: { weight: Weight }) {
  const locale = useLocale();

  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{weight.name || weight.code}</span>
        <span className="shrink-0 tabular-nums">
          {formatDecimal(weight.weightPct, locale, { maximumFractionDigits: 1 })}%
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${weight.pnlAmount < 0 ? 'bg-red-500/70' : 'bg-primary'}`}
          style={{ width: `${Math.min(100, weight.weightPct)}%` }}
        />
      </div>
    </li>
  );
}

function ExposureList({
  title,
  items,
  translate = false,
}: {
  title: string;
  items: Exposure[];
  /** scope는 'domestic'/'overseas' 키라 사람이 읽는 말로 바꾼다. */
  translate?: boolean;
}) {
  const locale = useLocale();
  const { t } = locale;

  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
        {items.map((item) => (
          <li key={item.label}>
            <span className="text-muted-foreground">
              {translate ? t(item.label === 'domestic' ? 'domesticStocks' : 'overseasStocks') : item.label}{' '}
            </span>
            {formatDecimal(item.weightPct, locale, { maximumFractionDigits: 1 })}%
          </li>
        ))}
      </ul>
    </div>
  );
}
