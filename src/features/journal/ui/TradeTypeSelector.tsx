'use client';

import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/features/locale';
import { TRADE_TYPES, type TradeType } from '../model/types';

interface Props {
  values: TradeType[];
  onChange: (next: TradeType[]) => void;
}

export function TradeTypeSelector({ values, onChange }: Props) {
  const { t } = useLocale();
  const toggle = (t: TradeType) => {
    if (values.includes(t)) onChange(values.filter((v) => v !== t));
    else onChange([...values, t]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {TRADE_TYPES.map((tradeType) => {
        const active = values.includes(tradeType);
        return (
          <button
            key={tradeType}
            type="button"
            onClick={() => toggle(tradeType)}
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
    </div>
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
