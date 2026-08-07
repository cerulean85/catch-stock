'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLocale } from '@/features/locale';
import { formatDateTime, formatDecimal } from '@/shared/lib/locale';
import type { AccountBalance, Holding, HoldingGroup, SyncStatus } from '../model/types';
import {
  nextSort,
  sortHoldings,
  type HoldingSort,
  type HoldingSortKey,
  type SortDirection,
} from '../model/sort';
import { StockLogo } from './StockLogo';
import { TickerDetailPanel } from './TickerDetailPanel';

export function AccountBalanceView({
  balance,
  riskCriteria,
}: {
  balance: AccountBalance;
  riskCriteria: string;
}) {
  const locale = useLocale();
  const { t } = locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Holding | null>(null);
  const { sync } = balance;
  const isEmpty = !balance.domestic && !balance.overseas;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('accountBalance')}</h1>
          {sync && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {t('lastSyncedAt')} {formatDateTime(sync.syncedAt, locale)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
          {pending ? t('refreshing') : t('refresh')}
        </Button>
      </header>

      {!sync ? (
        <Notice tone="warning">{t('syncNeverRan')}</Notice>
      ) : (
        <>
          {sync.status === 'error' && sync.message && (
            <Notice tone="error">
              {t('syncFailed')}: {sync.message}
            </Notice>
          )}

          {isEmpty ? (
            <p className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
              {t('noHoldings')}
            </p>
          ) : (
            <div
              className={
                selected ? 'grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : undefined
              }
            >
              <div className="flex min-w-0 flex-col gap-6">
                <HoldingSection
                  title={t('domesticStocks')}
                  group={balance.domestic}
                  selectedCode={selected?.code ?? null}
                  onSelect={setSelected}
                />
                <HoldingSection
                  title={t('overseasStocks')}
                  group={balance.overseas}
                  selectedCode={selected?.code ?? null}
                  onSelect={setSelected}
                />
              </div>
              {selected && (
                <TickerDetailPanel
                  key={`${selected.scope}-${selected.code}`}
                  holding={selected}
                  riskCriteria={riskCriteria}
                  onClose={() => setSelected(null)}
                />
              )}
            </div>
          )}
        </>
      )}

      <SyncFooter sync={sync} />
    </div>
  );
}

function Notice({ tone, children }: { tone: 'warning' | 'error'; children: React.ReactNode }) {
  const cls =
    tone === 'error'
      ? 'border-destructive/40 bg-destructive/5 text-destructive'
      : 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400';
  return <p className={`rounded-md border px-4 py-3 text-sm ${cls}`}>{children}</p>;
}

/** 키움에 등록해야 하는 IP는 웹이 아니라 수집 서버의 것이다. */
function SyncFooter({ sync }: { sync: SyncStatus | null }) {
  const { t } = useLocale();

  return (
    <p className="border-t pt-4 text-xs text-muted-foreground">
      {t('collectorIp')}:{' '}
      <span className="font-mono text-foreground/80">
        {sync?.publicIp ?? t('serverIpUnavailable')}
      </span>
      <span className="ml-1">{t('collectorIpHint')}</span>
    </p>
  );
}

const COLUMNS: { key: HoldingSortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'ticker', align: 'left' },
  { key: 'quantity', label: 'tradeQty', align: 'right' },
  { key: 'avgPrice', label: 'avgPrice', align: 'right' },
  { key: 'currentPrice', label: 'currentPrice', align: 'right' },
  { key: 'evalAmount', label: 'evalAmount', align: 'right' },
  { key: 'pnlAmount', label: 'pnlAmount', align: 'right' },
];

function HoldingSection({
  title,
  group,
  selectedCode,
  onSelect,
}: {
  title: string;
  group: HoldingGroup | null;
  selectedCode: string | null;
  onSelect: (holding: Holding) => void;
}) {
  const locale = useLocale();
  const { t } = locale;
  // 국내·해외 표는 각자 정렬 상태를 갖는다.
  const [sort, setSort] = useState<HoldingSort | null>(null);

  if (!group) return null;

  const holdings = sortHoldings(group.holdings, sort, locale.locale);

  const money = (value: number, currency: string) =>
    formatDecimal(value, locale, {
      minimumFractionDigits: currency === 'KRW' ? 0 : 2,
      maximumFractionDigits: currency === 'KRW' ? 0 : 2,
    });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label={t('holdingCount')} value={`${group.holdings.length}`} />
        <Tile
          label={t('totalEvalAmount')}
          value={`${money(group.totalEval, group.currency)} ${group.currency}`}
          sub={group.totalEvalKrw != null ? `${money(group.totalEvalKrw, 'KRW')} KRW` : undefined}
        />
        <Tile
          label={t('totalPnl')}
          value={`${money(group.totalPnl, group.currency)} ${group.currency}`}
          tone={group.totalPnl}
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <SortableHead
                  key={column.key}
                  label={t(column.label)}
                  align={column.align}
                  active={sort?.key === column.key ? sort.direction : null}
                  onClick={() => setSort((current) => nextSort(current, column.key))}
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => (
              <HoldingRow
                key={`${holding.scope}-${holding.code}`}
                holding={holding}
                selected={holding.code === selectedCode}
                onSelect={() => onSelect(holding)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function SortableHead({
  label,
  align,
  active,
  onClick,
}: {
  label: string;
  align: 'left' | 'right';
  active: SortDirection | null;
  onClick: () => void;
}) {
  const Icon = active === 'asc' ? ArrowUp : active === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <TableHead
      aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none'}
      className={align === 'right' ? 'text-right' : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex cursor-pointer items-center gap-1 hover:text-foreground ${
          active ? 'text-foreground' : ''
        }`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? '' : 'opacity-40'}`} />
      </button>
    </TableHead>
  );
}

function HoldingRow({
  holding,
  selected,
  onSelect,
}: {
  holding: Holding;
  selected: boolean;
  onSelect: () => void;
}) {
  const locale = useLocale();
  const digits = holding.currency === 'KRW' ? 0 : 2;
  const money = (value: number) =>
    formatDecimal(value, locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  return (
    <TableRow
      onClick={onSelect}
      aria-selected={selected}
      className={`cursor-pointer ${selected ? 'bg-muted' : ''}`}
    >
      <TableCell>
        <span className="flex items-center gap-2">
          <StockLogo code={holding.code} name={holding.name} />
          <span className="min-w-0">
            <span className="font-medium">{holding.name}</span>
            <span className="ml-1.5 font-mono text-xs text-muted-foreground">{holding.code}</span>
          </span>
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatDecimal(holding.quantity, locale)}
      </TableCell>
      <TableCell className="text-right tabular-nums">{money(holding.avgPrice)}</TableCell>
      <TableCell className="text-right tabular-nums">{money(holding.currentPrice)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {money(holding.evalAmount)}
        {holding.evalAmountKrw != null && (
          <span className="ml-1 block text-xs text-muted-foreground">
            {formatDecimal(holding.evalAmountKrw, locale, { maximumFractionDigits: 0 })} KRW
          </span>
        )}
      </TableCell>
      <TableCell className={`text-right tabular-nums ${toneClass(holding.pnlAmount)}`}>
        {money(holding.pnlAmount)}
        <span className="ml-1 block text-xs">
          {holding.pnlRate > 0 ? '+' : ''}
          {formatDecimal(holding.pnlRate, locale, { maximumFractionDigits: 2 })}%
        </span>
      </TableCell>
    </TableRow>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: number;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${toneClass(tone)}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>}
    </div>
  );
}

function toneClass(value?: number): string {
  if (value == null || value === 0) return '';
  return value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}
