'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/features/locale';
import { TRADE_TYPES, type JournalFilters, type TradeType } from '../model/types';

interface Props {
  initial: JournalFilters;
}

export function JournalListFilters({ initial }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(initial.q ?? '');

  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q.trim()) next.set('q', q.trim());
      else next.delete('q');
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `/journal?${qs}` : '/journal');
      });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setFilter = (key: 'ticker' | 'tag' | 'tradeType', value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `/journal?${qs}` : '/journal');
  };

  const activeTradeType = (params.get('tradeType') ?? '') as TradeType | '';
  const activeTicker = params.get('ticker') ?? '';
  const activeTag = params.get('tag') ?? '';

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('searchTitleBody')}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t('tradeType')}:</span>
        {TRADE_TYPES.map((tradeType) => {
          const active = activeTradeType === tradeType;
          return (
            <button
              key={tradeType}
              type="button"
              onClick={() => setFilter('tradeType', active ? null : tradeType)}
              aria-pressed={active}
            >
              <Badge
                variant={active ? 'default' : 'outline'}
                className="cursor-pointer select-none"
              >
                {tradeTypeLabel(tradeType, t)}
              </Badge>
            </button>
          );
        })}
        {(activeTicker || activeTag) && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            {activeTicker && (
              <ActiveChip
                label={`${t('ticker')}: ${activeTicker}`}
                onClear={() => setFilter('ticker', null)}
                clearLabel={t('clear')}
              />
            )}
            {activeTag && (
              <ActiveChip label={`${t('tag')}: ${activeTag}`} onClear={() => setFilter('tag', null)} clearLabel={t('clear')} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveChip({
  label,
  onClear,
  clearLabel,
}: {
  label: string;
  onClear: () => void;
  clearLabel?: string;
}) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      <span>{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`${label} ${clearLabel ?? 'clear'}`}
        className="rounded-sm hover:bg-muted-foreground/20"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

function tradeTypeLabel(value: TradeType, t: (key: string) => string): string {
  const keys: Record<TradeType, string> = {
    buy: 'tradeTypeBuy',
    sell: 'tradeTypeSell',
    hold: 'tradeTypeHold',
    analysis: 'tradeTypeAnalysis',
    plan: 'tradeTypePlan',
    reflection: 'tradeTypeReflection',
  };
  return t(keys[value]);
}
