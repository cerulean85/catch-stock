'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/features/locale';
import { formatDateTime } from '@/shared/lib/locale';
import type { Horizon, Journal, RiskCheck, TradeType } from '../model/types';

function excerpt(text: string, max = 140): string {
  const flat = text.replace(/[#*>`_~\-\[\]]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export function JournalCard({ journal }: { journal: Journal }) {
  const locale = useLocale();
  const { t } = locale;

  return (
    <Link
      href={`/journal/${journal.id}`}
      className="block transition-colors hover:bg-muted/30"
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="line-clamp-2 text-base sm:text-lg">{journal.title}</CardTitle>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatDateTime(journal.tradedAt, locale)}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {excerpt(journal.content) && (
            <p className="line-clamp-3 text-sm text-foreground/80">{excerpt(journal.content)}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {journal.tickers.slice(0, 6).map((t) => (
              <Badge key={t} variant="secondary" className="font-mono text-[11px]">
                {t}
              </Badge>
            ))}
            {journal.tradeTypes.map((t) => (
              <Badge key={t} variant="outline" className="text-[11px]">
                {tradeTypeLabel(t, locale.t)}
              </Badge>
            ))}
          </div>
          {journal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {journal.tags.slice(0, 6).map((tag) => (
                <span key={tag} className="text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {journal.riskChecks.length > 0 && (
            <div className="line-clamp-1 text-[11px] text-muted-foreground">
              {t('riskCheckPrefix')}: {journal.riskChecks.map((check) => riskCheckLabel(check, t)).join(', ')}
            </div>
          )}
          {(journal.sentiment != null || journal.horizon) && (
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              {journal.sentiment != null && (
                <span>{t('sentiment')}: {sentimentLabel(journal.sentiment, t)}</span>
              )}
              {journal.horizon && <span>{t('horizon')}: {horizonLabel(journal.horizon, t)}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
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
