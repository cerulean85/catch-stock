'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLiquidityStore } from '../model/store';
import type { LiquidityMetric, LiquidityMetricId, LiquidityPoint } from '../model/types';

export function LiquidityView() {
  const { status, result, error, load } = useLiquidityStore();
  const [selectedId, setSelectedId] = useState<LiquidityMetricId>('tga');

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  const selected = useMemo(
    () => result?.metrics.find((metric) => metric.id === selectedId) ?? result?.metrics[0] ?? null,
    [result, selectedId],
  );

  return (
    <section id="liquidity" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="h-4 w-4" />
            Market Liquidity
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">시장 유동성 잔고</h2>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <span className="text-xs text-muted-foreground tabular-nums">
              생성: {new Date(result.generatedAt).toLocaleString()} ·{' '}
              {result.cache.hit ? `cache (${result.cache.ttlSeconds}s)` : 'fresh'}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={status === 'loading'}
            onClick={() => void load({ refresh: true })}
          >
            <RefreshCw className={cn('h-4 w-4', status === 'loading' && 'animate-spin')} />
            새로고침
          </Button>
        </div>
      </header>

      {status === 'error' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="font-medium">유동성 데이터 불러오기 실패</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      {status === 'loading' && !result && <LoadingSkeleton />}

      {result && selected && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-md border bg-card p-4">
            <div className="flex flex-wrap gap-2">
              {result.metrics.map((metric) => (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => setSelectedId(metric.id)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                    selected.id === metric.id
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  <span className="block font-medium">{metric.name}</span>
                  <span className="block text-xs opacity-75">{metric.frequency}</span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{selected.name}</h3>
                  <p className="text-sm text-muted-foreground">{selected.label}</p>
                </div>
                <LatestValue metric={selected} />
              </div>
              <LiquidityChart points={selected.points} />
            </div>
          </div>

          <aside className="rounded-md border bg-card p-4">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">의미</dt>
                <dd className="mt-1">{selected.description}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">유동성 영향</dt>
                <dd
                  className={cn(
                    'mt-1 font-medium',
                    selected.risingImpact === 'positive' ? 'text-emerald-600' : 'text-rose-600',
                  )}
                >
                  {selected.impact}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">소스</dt>
                <dd className="mt-1 font-mono text-xs">{selected.source}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">단위</dt>
                <dd className="mt-1">십억 달러</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </section>
  );
}

function LatestValue({ metric }: { metric: LiquidityMetric }) {
  const latest = metric.latest;
  const previous = metric.previous;
  const delta = latest && previous ? latest.value - previous.value : null;
  const deltaLabel = delta === null ? null : `${delta >= 0 ? '+' : ''}${formatValue(delta)}`;

  return (
    <div className="text-right">
      <div className="text-2xl font-semibold tabular-nums">
        {latest ? formatValue(latest.value) : '-'}
      </div>
      <div className="text-xs text-muted-foreground">
        {latest?.date ?? '-'} {deltaLabel ? `· ${deltaLabel}` : ''}
      </div>
    </div>
  );
}

function LiquidityChart({ points }: { points: LiquidityPoint[] }) {
  const width = 720;
  const height = 280;
  const padding = { top: 16, right: 16, bottom: 28, left: 54 };
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const path = points
    .map((point, index) => {
      const x = padding.left + (index / Math.max(points.length - 1, 1)) * innerWidth;
      const y = padding.top + (1 - (point.value - min) / range) * innerHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
  const latest = points.at(-1);
  const first = points[0];

  return (
    <div className="mt-4 overflow-hidden rounded-md border bg-background">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" className="h-72 w-full">
        <title>유동성 잔고 추이</title>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + ratio * innerHeight;
          const value = max - ratio * range;
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                className="stroke-border"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {formatValue(value)}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" className="stroke-foreground" strokeWidth="2.5" />
        {latest && (
          <circle
            cx={width - padding.right}
            cy={padding.top + (1 - (latest.value - min) / range) * innerHeight}
            r="4"
            className="fill-foreground"
          />
        )}
        <text x={padding.left} y={height - 8} className="fill-muted-foreground text-[11px]">
          {first?.date ?? ''}
        </text>
        <text
          x={width - padding.right}
          y={height - 8}
          textAnchor="end"
          className="fill-muted-foreground text-[11px]"
        >
          {latest?.date ?? ''}
        </text>
      </svg>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 flex-1" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function formatValue(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: value >= 10 ? 0 : 2,
    minimumFractionDigits: value >= 10 ? 0 : 2,
  }).format(value);
}

