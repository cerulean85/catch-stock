'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/features/locale';
import { formatNumber } from '@/shared/lib/locale';
import { computeTradeMetrics } from '../model/metrics';

export interface TradeState {
  tradeQty: string;
  tradePrice: string;
  sellPrice: string;
  tradeFee: string;
  targetReturn: string;
  actualReturn: string;
}

export const EMPTY_TRADE: TradeState = {
  tradeQty: '',
  tradePrice: '',
  sellPrice: '',
  tradeFee: '',
  targetReturn: '',
  actualReturn: '',
};

interface Props {
  value: TradeState;
  onChange: (next: TradeState) => void;
}

const FIELDS: { key: keyof TradeState; label: string }[] = [
  { key: 'tradeQty', label: 'tradeQty' },
  { key: 'tradePrice', label: 'tradePrice' },
  { key: 'sellPrice', label: 'sellPrice' },
  { key: 'tradeFee', label: 'fee' },
  { key: 'targetReturn', label: 'targetReturn' },
  { key: 'actualReturn', label: 'actualReturn' },
];

export function TradeInfoFields({ value, onChange }: Props) {
  const locale = useLocale();
  const { t } = locale;
  const metrics = computeTradeMetrics(value);
  const showMetrics =
    metrics.totalCost != null || metrics.returnPct != null || metrics.pnlAmount != null;

  const set = (key: keyof TradeState, v: string) => onChange({ ...value, [key]: v });
  const fmt = (n: number | null) =>
    n == null ? '—' : formatNumber(Math.round(n * 100) / 100, locale);

  return (
    <fieldset className="grid grid-cols-2 gap-3 rounded-md border p-4 sm:grid-cols-3">
      <legend className="px-1 text-sm font-medium">{t('tradeInfoOptional')}</legend>
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={f.key} className="text-xs">
            {t(f.label)}
          </Label>
          <Input
            id={f.key}
            name={f.key}
            type="number"
            step="any"
            value={value[f.key]}
            onChange={(e) => set(f.key, e.target.value)}
          />
        </div>
      ))}
      {showMetrics && (
        <div className="col-span-2 mt-1 flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-xs sm:col-span-3">
          <Metric label={t('totalCost')} value={fmt(metrics.totalCost)} />
          <Metric
            label={t('computedReturn')}
            value={metrics.returnPct == null ? '—' : `${fmt(metrics.returnPct)}%`}
            tone={metrics.returnPct}
          />
          <Metric label={t('pnlAmount')} value={fmt(metrics.pnlAmount)} tone={metrics.pnlAmount} />
        </div>
      )}
    </fieldset>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: number | null;
}) {
  const color =
    tone == null ? '' : tone > 0 ? 'text-emerald-600 dark:text-emerald-400' : tone < 0 ? 'text-red-600 dark:text-red-400' : '';
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${color}`}>{value}</span>
    </span>
  );
}
