'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useScoringStore } from '../model/store';
import { ScoringTable } from './ScoringTable';
import type { MacroSnapshot } from '../model/types';

const PRESETS = [
  { key: 'balanced', label: '균형형' },
  { key: 'value', label: '가치형' },
  { key: 'growth', label: '성장형' },
];
const UNIVERSES = [
  { key: 'demo', label: '데모 10' },
  { key: 'default', label: '대표 30' },
  { key: 'sp500', label: 'S&P 101' },
];

export function ScoringView() {
  const { status, preset, universe, result, error, setPreset, setUniverse, load } =
    useScoringStore();

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">20 투자기준 스코어링</h1>
          <p className="text-sm text-muted-foreground">
            미국 주식을 20개 기준으로 0~100점 스코어링·스크리닝 (inv-stds 통합)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            value={preset}
            onChange={(v) => {
              setPreset(v);
              void load();
            }}
            options={PRESETS}
            label="프리셋"
          />
          <NativeSelect
            value={universe}
            onChange={(v) => {
              setUniverse(v);
              void load();
            }}
            options={UNIVERSES}
            label="유니버스"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={status === 'loading'}
            onClick={() => void load({ refresh: true })}
          >
            {status === 'loading' ? '조회 중…' : '새로고침'}
          </Button>
        </div>
      </header>

      {result?.macro && <MacroBanner macro={result.macro} />}

      {status === 'error' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="font-medium">불러오기 실패</div>
          <div className="mt-1">{error}</div>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={() => void load({ refresh: true })}
          >
            다시 시도
          </Button>
        </div>
      )}

      {status === 'loading' && !result && <LoadingSkeleton />}

      {result && <ScoringTable items={result.items} preset={preset} />}

      {result && result.skipped.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">제외된 종목 {result.skipped.length}</summary>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
            {result.skipped.map((s) => (
              <li key={s.symbol} className="font-mono">
                {s.symbol} <span className="text-muted-foreground">({s.reason})</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function MacroBanner({ macro }: { macro: MacroSnapshot }) {
  const tone =
    macro.subscore >= 4
      ? 'border-emerald-500/40 bg-emerald-500/5'
      : macro.subscore <= 2
        ? 'border-destructive/40 bg-destructive/5'
        : 'border-border bg-muted/30';
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md border p-3 text-xs ${tone}`}>
      <span className="text-sm font-semibold">
        #17 금리·환율 레짐: {macro.regime} ({macro.subscore.toFixed(1)}/5)
      </span>
      <span className="tabular-nums text-muted-foreground">
        10Y {macro.treasury10y.toFixed(2)}%
        {macro.curveSpread !== null && ` · 곡선 ${macro.curveSpread.toFixed(2)}%p`}
        {macro.rateChange3m !== null && ` · 3M변화 ${macro.rateChange3m.toFixed(2)}%p`}
      </span>
      {macro.drivers.length > 0 && (
        <span className="text-muted-foreground">{macro.drivers.join(' · ')}</span>
      )}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border bg-background px-2 py-1.5 text-xs text-foreground"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
