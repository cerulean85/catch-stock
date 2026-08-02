'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/features/locale';
import { formatNumber } from '@/shared/lib/locale';
import { sentimentLabel, tradeTypeLabel } from '../model/labels';
import type { JournalStats, TradeHighlight } from '../model/types';

const POS = '#059669';
const NEG = '#dc2626';
const NEUTRAL = '#6366f1';

function round2(n: number | null): number | null {
  return n == null ? null : Math.round(n * 100) / 100;
}

export function JournalStatsView({ stats }: { stats: JournalStats }) {
  const locale = useLocale();
  const { t } = locale;
  const pct = (n: number | null) => (n == null ? '—' : `${formatNumber(round2(n)!, locale)}%`);
  const ratio = (n: number | null) =>
    n == null ? '—' : `${formatNumber(Math.round(n * 100), locale)}%`;

  const tickerData = stats.tickers
    .filter((x) => x.avgReturn != null)
    .map((x) => ({
      name: x.ticker,
      value: round2(x.avgReturn)!,
      count: x.count,
      winRate: x.winRate == null ? null : Math.round(x.winRate * 100),
    }));

  const sentimentData = stats.sentiments
    .filter((x) => x.avgReturn != null)
    .map((x) => ({
      name: sentimentLabel(x.sentiment, t),
      value: round2(x.avgReturn)!,
      count: x.count,
    }));

  const tradeTypeData = stats.tradeTypes
    .filter((x) => x.count > 0)
    .map((x) => ({ name: tradeTypeLabel(x.tradeType, t), value: x.count }));

  const monthlyData = stats.monthly.map((m) => ({
    name: m.month.slice(2),
    count: m.count,
    value: round2(m.avgReturn),
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('journalStats')}</h1>
          <p className="text-sm text-muted-foreground">{t('journalStatsDescription')}</p>
        </div>
        <Link href="/journal" className={buttonVariants({ variant: 'outline' })}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t('backToList')}
        </Link>
      </header>

      {stats.total === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
          {t('journalEmpty')}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label={t('statsTotal')} value={formatNumber(stats.total, locale)} />
            <Tile label={t('statsWithReturn')} value={formatNumber(stats.withReturn, locale)} />
            <Tile label={t('statsWinRate')} value={ratio(stats.overallWinRate)} />
            <Tile
              label={t('statsAvgReturn')}
              value={pct(stats.overallAvgReturn)}
              tone={stats.overallAvgReturn}
            />
          </section>

          {(stats.best || stats.worst) && (
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <HighlightTile label={t('statsBest')} trade={stats.best} pct={pct} />
              <HighlightTile label={t('statsWorst')} trade={stats.worst} pct={pct} />
            </section>
          )}

          <ChartCard
            title={t('statsMonthlyTrend')}
            empty={monthlyData.length === 0}
            emptyText={t('statsEmpty')}
          >
            <ComposedChart data={monthlyData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis yAxisId="ret" orientation="right" tick={{ fontSize: 12 }} unit="%" />
              <Tooltip content={<MonthlyTooltip locale={locale} t={t} />} cursor={{ fill: 'transparent' }} />
              <Bar yAxisId="count" dataKey="count" radius={4} fill={NEUTRAL} opacity={0.6} />
              <Line
                yAxisId="ret"
                type="monotone"
                dataKey="value"
                stroke={POS}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </ComposedChart>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title={t('statsTickerReturns')} empty={tickerData.length === 0} emptyText={t('statsNoReturnData')}>
              <BarChart data={tickerData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} unit="%" />
                <YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={<ReturnTooltip locale={locale} suffix="%" winRateLabel={t('statsWinRate')} />}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="value" radius={4}>
                  {tickerData.map((d) => (
                    <Cell key={d.name} fill={d.value >= 0 ? POS : NEG} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>

            <ChartCard
              title={t('statsSentimentReturns')}
              empty={sentimentData.length === 0}
              emptyText={t('statsNoReturnData')}
            >
              <BarChart data={sentimentData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip content={<ReturnTooltip locale={locale} suffix="%" />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={4}>
                  {sentimentData.map((d) => (
                    <Cell key={d.name} fill={d.value >= 0 ? POS : NEG} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>

            <ChartCard title={t('statsTradeTypeDist')} empty={tradeTypeData.length === 0} emptyText={t('statsEmpty')}>
              <BarChart data={tradeTypeData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip content={<ReturnTooltip locale={locale} />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={4} fill={NEUTRAL} />
              </BarChart>
            </ChartCard>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('statsRiskCompliance')}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <ComparePane
                  label={t('statsWithStopLoss')}
                  count={stats.riskCompliance.withStopLoss.count}
                  avgReturn={stats.riskCompliance.withStopLoss.avgReturn}
                  pct={pct}
                  countSuffix={t('journalCountSuffix')}
                />
                <ComparePane
                  label={t('statsWithoutStopLoss')}
                  count={stats.riskCompliance.withoutStopLoss.count}
                  avgReturn={stats.riskCompliance.withoutStopLoss.avgReturn}
                  pct={pct}
                  countSuffix={t('journalCountSuffix')}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function toneColor(n: number | null | undefined): string {
  return n == null || n === 0
    ? ''
    : n > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: number | null }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneColor(tone)}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function HighlightTile({
  label,
  trade,
  pct,
}: {
  label: string;
  trade: TradeHighlight | null;
  pct: (n: number | null) => string;
}) {
  if (!trade) return null;
  return (
    <Link href={`/journal/${trade.id}`} className="block">
      <Card className="transition-colors hover:bg-muted/30">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="truncate text-sm font-medium">{trade.title}</p>
            {trade.ticker && (
              <span className="font-mono text-[11px] text-muted-foreground">{trade.ticker}</span>
            )}
          </div>
          <span className={`shrink-0 text-xl font-semibold tabular-nums ${toneColor(trade.returnPct)}`}>
            {pct(trade.returnPct)}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function ChartCard({
  title,
  empty,
  emptyText,
  children,
}: {
  title: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactElement;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            {children}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ComparePane({
  label,
  count,
  avgReturn,
  pct,
  countSuffix,
}: {
  label: string;
  count: number;
  avgReturn: number | null;
  pct: (n: number | null) => string;
  countSuffix: string;
}) {
  return (
    <div className="rounded-md border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneColor(avgReturn)}`}>
        {pct(avgReturn)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {count} {countSuffix}
      </p>
    </div>
  );
}

type LocaleArg = Parameters<typeof formatNumber>[1];

interface TooltipPayload {
  payload: { name: string; value: number; count?: number; winRate?: number | null };
}

function ReturnTooltip({
  active,
  payload,
  locale,
  suffix = '',
  winRateLabel,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  locale: LocaleArg;
  suffix?: string;
  winRateLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{d.name}</p>
      <p className="tabular-nums">
        {formatNumber(d.value, locale)}
        {suffix}
      </p>
      {d.count != null && (
        <p className="text-muted-foreground tabular-nums">n = {formatNumber(d.count, locale)}</p>
      )}
      {winRateLabel && d.winRate != null && (
        <p className="text-muted-foreground tabular-nums">
          {winRateLabel} {formatNumber(d.winRate, locale)}%
        </p>
      )}
    </div>
  );
}

interface MonthlyPayload {
  payload: { name: string; count: number; value: number | null };
}

function MonthlyTooltip({
  active,
  payload,
  locale,
  t,
}: {
  active?: boolean;
  payload?: MonthlyPayload[];
  locale: LocaleArg;
  t: (key: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{d.name}</p>
      <p className="text-muted-foreground tabular-nums">
        {t('journalCountSuffix')} {formatNumber(d.count, locale)}
      </p>
      {d.value != null && (
        <p className="tabular-nums">
          {t('statsAvgReturn')} {formatNumber(d.value, locale)}%
        </p>
      )}
    </div>
  );
}
