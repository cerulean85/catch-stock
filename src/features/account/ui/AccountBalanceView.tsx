'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
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
import type { AccountBalance, Holding, HoldingGroup } from '../model/types';
import type { ServerIp } from '../model/ip';
import { StockLogo } from './StockLogo';

interface Props {
  balance: AccountBalance | null;
  configured: boolean;
  serverIp: ServerIp;
}

export function AccountBalanceView({ balance, configured, serverIp }: Props) {
  const locale = useLocale();
  const { t } = locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('accountBalance')}</h1>
          {balance && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {t('fetchedAt')} {formatDateTime(balance.fetchedAt, locale)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !configured}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
          {pending ? t('refreshing') : t('refresh')}
        </Button>
      </header>

      {!configured ? (
        <Notice tone="warning">{t('accountNotConfigured')}</Notice>
      ) : (
        <>
          {balance?.errors.map((error) => (
            <Notice key={error.scope} tone="error">
              {t(error.scope === 'domestic' ? 'domesticStocks' : 'overseasStocks')}:{' '}
              {error.message}
            </Notice>
          ))}

          <HoldingSection title={t('domesticStocks')} group={balance?.domestic ?? null} />
          <HoldingSection title={t('overseasStocks')} group={balance?.overseas ?? null} />
        </>
      )}

      <ServerIpLine serverIp={serverIp} />
    </div>
  );
}

/** 키움처럼 호출 IP 등록이 필요한 API를 쓰기 때문에, 이 서버가 밖에서 어떤 IP로 보이는지 표시한다. */
function ServerIpLine({ serverIp }: { serverIp: ServerIp }) {
  const { t } = useLocale();

  return (
    <p className="border-t pt-4 text-xs text-muted-foreground">
      {t('serverIp')}:{' '}
      <span className="font-mono text-foreground/80">
        {serverIp.publicIp ?? t('serverIpUnavailable')}
      </span>
      {serverIp.localIps.length > 0 && (
        <>
          {' · '}
          {t('serverLocalIp')}:{' '}
          <span className="font-mono">{serverIp.localIps.join(', ')}</span>
        </>
      )}
    </p>
  );
}

function Notice({ tone, children }: { tone: 'warning' | 'error'; children: React.ReactNode }) {
  const cls =
    tone === 'error'
      ? 'border-destructive/40 bg-destructive/5 text-destructive'
      : 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400';
  return <p className={`rounded-md border px-4 py-3 text-sm ${cls}`}>{children}</p>;
}

function HoldingSection({ title, group }: { title: string; group: HoldingGroup | null }) {
  const locale = useLocale();
  const { t } = locale;

  if (!group) return null;

  const money = (value: number, currency: string) =>
    formatDecimal(value, locale, {
      minimumFractionDigits: currency === 'KRW' ? 0 : 2,
      maximumFractionDigits: currency === 'KRW' ? 0 : 2,
    });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>

      {group.holdings.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('noHoldings')}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Tile label={t('holdingCount')} value={`${group.holdings.length}`} />
            <Tile
              label={t('totalEvalAmount')}
              value={`${money(group.totalEval, group.currency)} ${group.currency}`}
              sub={
                group.totalEvalKrw != null
                  ? `${money(group.totalEvalKrw, 'KRW')} KRW`
                  : undefined
              }
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
                  <TableHead>{t('ticker')}</TableHead>
                  <TableHead className="text-right">{t('tradeQty')}</TableHead>
                  <TableHead className="text-right">{t('avgPrice')}</TableHead>
                  <TableHead className="text-right">{t('currentPrice')}</TableHead>
                  <TableHead className="text-right">{t('evalAmount')}</TableHead>
                  <TableHead className="text-right">{t('pnlAmount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.holdings.map((holding) => (
                  <HoldingRow key={`${holding.code}-${holding.name}`} holding={holding} />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}

function HoldingRow({ holding }: { holding: Holding }) {
  const locale = useLocale();
  const digits = holding.currency === 'KRW' ? 0 : 2;
  const money = (value: number) =>
    formatDecimal(value, locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  return (
    <TableRow>
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
  return value > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400';
}
