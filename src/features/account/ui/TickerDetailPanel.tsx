'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import { formatDateTime, formatDecimal } from '@/shared/lib/locale';
import { RiskPanel } from '@/features/risk';
import { getTickerDetailAction } from '../api/actions';
import type { Holding, TickerDetail, TradeSide } from '../model/types';
import { StockLogo } from './StockLogo';

type Tab = 'journals' | 'risk' | 'trades';

export function TickerDetailPanel({
  holding,
  riskCriteria,
  onClose,
}: {
  holding: Holding;
  riskCriteria: string;
  onClose: () => void;
}) {
  const locale = useLocale();
  const { t } = locale;
  const [tab, setTab] = useState<Tab>('journals');
  const [detail, setDetail] = useState<TickerDetail | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const next = await getTickerDetailAction(holding.scope, holding.code);
      // 선택한 종목이 바뀌면 늦게 도착한 응답은 버린다.
      if (cancelled) return;
      setDetail(next);
    });
    return () => {
      cancelled = true;
    };
  }, [holding.scope, holding.code]);

  return (
    <aside className="flex flex-col gap-4 rounded-md border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <StockLogo code={holding.code} name={holding.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{holding.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{holding.code}</p>
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          aria-label={t('close')}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex rounded-md border p-0.5 text-sm">
        <TabButton active={tab === 'journals'} onClick={() => setTab('journals')}>
          {t('journal')}
        </TabButton>
        <TabButton active={tab === 'risk'} onClick={() => setTab('risk')}>
          {t('risk')}
        </TabButton>
        <TabButton active={tab === 'trades'} onClick={() => setTab('trades')}>
          {t('tradeHistory')}
        </TabButton>
      </div>

      {tab === 'risk' ? (
        <RiskPanel holding={holding} criteria={riskCriteria} />
      ) : pending || !detail ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('refreshing')}</p>
      ) : tab === 'trades' ? (
        <TradeList detail={detail} />
      ) : (
        <JournalList detail={detail} />
      )}
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 cursor-pointer rounded px-3 py-1.5 ${
        active ? 'bg-secondary font-medium' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function TradeList({ detail }: { detail: TickerDetail }) {
  const locale = useLocale();
  const { t } = locale;

  if (detail.trades.length === 0) {
    return <Empty>{t('noTradeHistory')}</Empty>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {detail.trades.map((trade) => {
        const digits = trade.currency === 'KRW' ? 0 : 2;
        const money = (value: number) =>
          formatDecimal(value, locale, {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
          });
        return (
          <li key={`${trade.tradedOn}-${trade.dealId}`} className="rounded-md border px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">
                {trade.tradedOn}
                {trade.tradedTime && ` ${trade.tradedTime}`}
              </span>
              <SideBadge side={trade.side} label={trade.sideLabel} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-sm tabular-nums">
              <span>
                {formatDecimal(trade.quantity, locale)}
                {t('quantitySuffix')}
              </span>
              <span className="text-muted-foreground">×</span>
              <span>{money(trade.price)}</span>
              <span className="ml-auto font-medium">
                {money(trade.amount)} {trade.currency}
              </span>
            </div>
            {trade.fee != null && trade.fee !== 0 && (
              <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                {t('fee')} {money(trade.fee)} {trade.currency}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** 매수/매도를 색과 라벨로 구분한다. 방향을 못 읽은 건은 원문을 그대로 보여준다. */
function SideBadge({ side, label }: { side: TradeSide; label: string | null }) {
  const { t } = useLocale();

  if (side === 'other') {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {label || t('sideUnknown')}
      </Badge>
    );
  }

  const isSell = side === 'sell';
  return (
    <Badge
      variant="outline"
      className={
        isSell
          ? 'border-red-500/40 text-red-600 dark:text-red-400'
          : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
      }
      title={label ?? undefined}
    >
      {isSell ? t('tradeTypeSell') : t('tradeTypeBuy')}
    </Badge>
  );
}

function JournalList({ detail }: { detail: TickerDetail }) {
  const locale = useLocale();
  const { t } = locale;

  if (detail.journals.length === 0) {
    return <Empty>{t('timelineEmpty')}</Empty>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {detail.journals.map((journal) => (
        <li key={journal.id}>
          <Link
            href={`/journal/${journal.id}`}
            className="block rounded-md border px-3 py-2 transition-colors hover:bg-muted/40"
          >
            <p className="truncate text-sm font-medium">{journal.title}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="tabular-nums">{formatDateTime(journal.tradedAt, locale)}</span>
              {journal.returnPct != null && (
                <span
                  className={
                    journal.returnPct > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : journal.returnPct < 0
                        ? 'text-red-600 dark:text-red-400'
                        : ''
                  }
                >
                  {journal.returnPct > 0 ? '+' : ''}
                  {formatDecimal(journal.returnPct, locale, { maximumFractionDigits: 2 })}%
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
