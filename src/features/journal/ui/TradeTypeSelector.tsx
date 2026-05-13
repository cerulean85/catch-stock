'use client';

import { Badge } from '@/components/ui/badge';
import { TRADE_TYPES, TRADE_TYPE_LABELS, type TradeType } from '../model/types';

interface Props {
  values: TradeType[];
  onChange: (next: TradeType[]) => void;
}

export function TradeTypeSelector({ values, onChange }: Props) {
  const toggle = (t: TradeType) => {
    if (values.includes(t)) onChange(values.filter((v) => v !== t));
    else onChange([...values, t]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {TRADE_TYPES.map((t) => {
        const active = values.includes(t);
        return (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
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
    </div>
  );
}
