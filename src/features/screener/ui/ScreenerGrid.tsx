'use client';

import { ExternalLink, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDecimal, type LocaleSettings } from '@/shared/lib/locale';
import { useWatchlistStore } from '@/features/watchlist/model/store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ScreenerItem } from '../model/types';

interface Props {
  items: ScreenerItem[];
  locale: Pick<LocaleSettings, 'locale'> & { t?: (key: string) => string };
}

export function ScreenerGrid({ items, locale }: Props) {
  const t = locale.t ?? ((key: string) => key);
  const { result: watchlist, add } = useWatchlistStore();
  const watchlistSymbols = new Set(watchlist?.symbols ?? []);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
        {t('emptyScreener')}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Sector</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Daily RSI14</TableHead>
            <TableHead className="text-right">Monthly RSI14</TableHead>
            <TableHead className="w-[112px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.symbol}>
              <TableCell className="font-mono font-medium">{item.symbol}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{item.sector}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(item.price, locale)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatDecimal(item.dailyRSI14, locale, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {formatDecimal(item.monthlyRSI14, locale, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {watchlist?.authenticated && (
                    <button
                      type="button"
                      disabled={watchlistSymbols.has(item.symbol)}
                      onClick={() => void add(item.symbol).catch(() => undefined)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`${item.symbol} ${t('watchlist')}`}
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                <a
                  href={`https://finance.yahoo.com/quote/${encodeURIComponent(item.symbol)}/news/`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={`${item.symbol} ${t('symbolNewsLabel')}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
