'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLocale } from '@/features/locale';
import {
  formatDateTime,
  formatNumber as formatLocaleNumber,
  type LocaleSettings,
} from '@/shared/lib/locale';
import {
  type Horizon,
  type Journal,
  type RiskCheck,
  type TradeType,
} from '../model/types';
import { DeleteJournalButton } from './DeleteJournalButton';
import { MarkdownPreview } from './MarkdownPreview';

function formatNumber(s: string | null, locale: Pick<LocaleSettings, 'locale'>): string | null {
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? formatLocaleNumber(n, locale) : s;
}

export function JournalDetail({ journal }: { journal: Journal }) {
  const locale = useLocale();
  const { t } = locale;
  const trade = {
    qty: formatNumber(journal.tradeQty, locale),
    price: formatNumber(journal.tradePrice, locale),
    fee: formatNumber(journal.tradeFee, locale),
    target: formatNumber(journal.targetReturn, locale),
    actual: formatNumber(journal.actualReturn, locale),
  };
  const hasTrade =
    trade.qty != null ||
    trade.price != null ||
    trade.fee != null ||
    trade.target != null ||
    trade.actual != null;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{journal.title}</h1>
          <div className="flex items-center gap-2">
            <Link
              href={`/journal/${journal.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <Pencil className="mr-2 h-4 w-4" /> {t('edit')}
            </Link>
            <DeleteJournalButton id={journal.id} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatDateTime(journal.tradedAt, locale)}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {journal.tickers.map((t) => (
            <Badge key={t} variant="secondary" className="font-mono">
              {t}
            </Badge>
          ))}
          {journal.tradeTypes.map((t) => (
            <Badge key={t} variant="outline">
              {tradeTypeLabel(t, locale.t)}
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
              <span>{t('sentiment')}: {sentimentLabel(journal.sentiment, t)}</span>
            )}
            {journal.horizon && <span>{t('horizon')}: {horizonLabel(journal.horizon, t)}</span>}
          </div>
        )}
      </header>

      {hasTrade && (
        <section className="grid grid-cols-2 gap-3 rounded-md border bg-card p-4 sm:grid-cols-5">
          <Cell label={t('tradeQty')} value={trade.qty} />
          <Cell label={t('tradePrice')} value={trade.price} />
          <Cell label={t('fee')} value={trade.fee} />
          <Cell label={t('targetReturn')} value={trade.target} />
          <Cell label={t('actualReturn')} value={trade.actual} />
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

function tradeTypeLabel(value: TradeType, t: (key: string) => string): string {
  return t({
    buy: 'tradeTypeBuy',
    sell: 'tradeTypeSell',
    hold: 'tradeTypeHold',
    analysis: 'tradeTypeAnalysis',
    plan: 'tradeTypePlan',
    reflection: 'tradeTypeReflection',
  }[value]);
}

function horizonLabel(value: Horizon, t: (key: string) => string): string {
  return t({ short: 'horizonShort', mid: 'horizonMid', long: 'horizonLong' }[value]);
}

function sentimentLabel(value: number, t: (key: string) => string): string {
  const key = {
    1: 'sentimentVeryNegative',
    2: 'sentimentNegative',
    3: 'sentimentNeutral',
    4: 'sentimentPositive',
    5: 'sentimentVeryPositive',
  }[value];
  return key ? t(key) : String(value);
}

function riskCheckLabel(value: RiskCheck, t: (key: string) => string): string {
  return t({
    entryReason: 'riskEntryReason',
    stopLoss: 'riskStopLoss',
    positionSize: 'riskPositionSize',
    earningsDate: 'riskEarningsDate',
    marketDirection: 'riskMarketDirection',
    invalidation: 'riskInvalidation',
  }[value]);
}

function Cell({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums">{value ?? '—'}</span>
    </div>
  );
}
