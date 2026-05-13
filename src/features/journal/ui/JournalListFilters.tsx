'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TRADE_TYPES, TRADE_TYPE_LABELS, type JournalFilters, type TradeType } from '../model/types';

interface Props {
  initial: JournalFilters;
}

export function JournalListFilters({ initial }: Props) {
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
          placeholder="제목·본문 검색"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">투자 유형:</span>
        {TRADE_TYPES.map((t) => {
          const active = activeTradeType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilter('tradeType', active ? null : t)}
              aria-pressed={active}
            >
              <Badge
                variant={active ? 'default' : 'outline'}
                className="cursor-pointer select-none"
              >
                {TRADE_TYPE_LABELS[t]}
              </Badge>
            </button>
          );
        })}
        {(activeTicker || activeTag) && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            {activeTicker && (
              <ActiveChip
                label={`종목: ${activeTicker}`}
                onClear={() => setFilter('ticker', null)}
              />
            )}
            {activeTag && (
              <ActiveChip label={`태그: ${activeTag}`} onClear={() => setFilter('tag', null)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      <span>{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`${label} 해제`}
        className="rounded-sm hover:bg-muted-foreground/20"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
