'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocale } from '@/features/locale';
import {
  DEFAULT_SORT,
  JOURNAL_SORTS,
  TRADE_TYPES,
  type JournalFilters,
  type JournalSort,
  type TradeType,
} from '../model/types';
import { tradeTypeLabel } from '../model/labels';

interface Props {
  initial: JournalFilters;
}

const SORT_LABELS: Record<JournalSort, string> = {
  tradedAt: 'sortLatest',
  oldest: 'sortOldest',
  return: 'sortReturn',
  sentiment: 'sortSentiment',
};

export function JournalListFilters({ initial }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(initial.q ?? '');

  // 검색어·정렬·필터가 바뀌면 항상 1페이지로 되돌린 URL을 만든다.
  const buildUrl = (mutate: (sp: URLSearchParams) => void) => {
    const sp = new URLSearchParams(params.toString());
    mutate(sp);
    sp.delete('page');
    const qs = sp.toString();
    return qs ? `/journal?${qs}` : '/journal';
  };

  useEffect(() => {
    const id = setTimeout(() => {
      const url = buildUrl((sp) => {
        if (q.trim()) sp.set('q', q.trim());
        else sp.delete('q');
      });
      startTransition(() => router.replace(url));
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setFilter = (key: 'ticker' | 'tag' | 'tradeType' | 'sort', value: string | null) => {
    router.replace(
      buildUrl((sp) => {
        if (value) sp.set(key, value);
        else sp.delete(key);
      }),
    );
  };

  const activeTradeType = (params.get('tradeType') ?? '') as TradeType | '';
  const activeTicker = params.get('ticker') ?? '';
  const activeTag = params.get('tag') ?? '';
  const activeSort = (params.get('sort') ?? DEFAULT_SORT) as JournalSort;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchTitleBody')}
            className="pl-9"
          />
        </div>
        <Select
          value={activeSort}
          onValueChange={(v) => setFilter('sort', v === DEFAULT_SORT ? null : v)}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOURNAL_SORTS.map((s) => (
              <SelectItem key={s} value={s}>
                {t(SORT_LABELS[s])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              <Badge variant={active ? 'default' : 'outline'} className="cursor-pointer select-none">
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
              <ActiveChip
                label={`${t('tag')}: ${activeTag}`}
                onClear={() => setFilter('tag', null)}
                clearLabel={t('clear')}
              />
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
