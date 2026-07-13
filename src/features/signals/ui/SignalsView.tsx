'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SignalScanResponse, MicrocapScanResponse } from '../model/types';
import type { AltmanZone } from '../model/altman';

type Strategy = 'forced' | 'microcap';
type Sensitivity = 'strict' | 'moderate';

const STRATEGIES: { key: Strategy; label: string }[] = [
  { key: 'forced', label: '전략1 · 강제청산' },
  { key: 'microcap', label: '전략2 · 마이크로캡' },
];
const UNIVERSES = [
  { key: 'demo', label: '데모 10' },
  { key: 'default', label: '대표 30' },
  { key: 'sp500', label: 'S&P 101' },
];
const SENSITIVITY = [
  { key: 'strict', label: '엄격(-20%·RSI25·4x)' },
  { key: 'moderate', label: '관망(-8%·RSI40·2x)' },
];
const SENS_PARAMS: Record<Sensitivity, string> = {
  strict: 'drop=-20&rsi=25&volMult=4',
  moderate: 'drop=-8&rsi=40&volMult=2',
};

export function SignalsView() {
  const [strategy, setStrategy] = useState<Strategy>('forced');
  const [sensitivity, setSensitivity] = useState<Sensitivity>('strict');
  const [universe, setUniverse] = useState('default');
  const [forced, setForced] = useState<SignalScanResponse | null>(null);
  const [micro, setMicro] = useState<MicrocapScanResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setStatus('loading');
    setError(undefined);
    try {
      const url =
        strategy === 'forced'
          ? `/api/signals/scan?universe=${universe}&${SENS_PARAMS[sensitivity]}`
          : `/api/signals/microcap`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.message ?? data.error);
      if (strategy === 'forced') setForced(data);
      else setMicro(data);
      setStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
      setStatus('error');
    }
  }, [strategy, sensitivity, universe]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = strategy === 'forced' ? forced : micro;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">수급왜곡 탐지 신호</h1>
          <p className="text-sm text-muted-foreground">
            concept2 전략 중 무료·가용 데이터로 판정 가능한 범위 (강제청산 · 마이크로캡)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {strategy === 'forced' && (
            <>
              <NativeSelect value={sensitivity} onChange={(v) => setSensitivity(v as Sensitivity)} options={SENSITIVITY} label="민감도" />
              <NativeSelect value={universe} onChange={setUniverse} options={UNIVERSES} label="유니버스" />
            </>
          )}
          <Button variant="outline" size="sm" disabled={status === 'loading'} onClick={() => void load()}>
            {status === 'loading' ? '조회 중…' : '새로고침'}
          </Button>
        </div>
      </header>

      <div className="flex gap-1 border-b">
        {STRATEGIES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStrategy(s.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              strategy === s.key
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {status === 'error' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="font-medium">불러오기 실패</div>
          <div className="mt-1">{error}</div>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void load()}>
            다시 시도
          </Button>
        </div>
      )}

      {status === 'loading' && !active && <LoadingSkeleton />}

      {active && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="text-sm font-medium text-foreground">{active.label}</span>
            <span className="tabular-nums">
              스캔 {active.scanned} · 탐지 {active.candidates.length}
            </span>
            <span>기준일 {active.asOf}</span>
          </div>

          {'note' in active && active.note && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              {active.note}
            </div>
          )}

          {strategy === 'forced' && forced && <ForcedTable res={forced} />}
          {strategy === 'microcap' && micro && <MicrocapTable res={micro} />}

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">판정에서 생략된 조건 {active.omitted.length}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {active.omitted.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}

function ForcedTable({ res }: { res: SignalScanResponse }) {
  if (res.candidates.length === 0) {
    return (
      <EmptyState text="탐지된 강제청산 후보가 없습니다. 현재 시장에 급락·과매도·거래량폭증을 동시 충족하는 종목이 없거나, 민감도를 낮춰보세요." />
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <Th className="text-left">Symbol</Th>
            <Th className="text-left">Name</Th>
            <Th>{res.params.dropWindow}일 등락%</Th>
            <Th>RSI(14)</Th>
            <Th>거래량 배수</Th>
            <Th>Altman-Z</Th>
          </tr>
        </thead>
        <tbody>
          {res.candidates.map((c) => (
            <tr key={c.symbol} className="border-b last:border-0">
              <Td className="text-left font-mono font-medium">{c.symbol}</Td>
              <Td className="text-left text-muted-foreground">{c.name}</Td>
              <Td className="tabular-nums text-destructive">{c.signal.dropPct.toFixed(1)}%</Td>
              <Td className="tabular-nums">{c.signal.rsi?.toFixed(0) ?? '—'}</Td>
              <Td className="tabular-nums">{c.signal.volumeRatio?.toFixed(1) ?? '—'}x</Td>
              <Td>{c.altman ? <ZoneBadge z={c.altman.z} zone={c.altman.zone} /> : <span className="text-muted-foreground">—</span>}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MicrocapTable({ res }: { res: MicrocapScanResponse }) {
  if (res.candidates.length === 0) {
    return (
      <EmptyState text="조건을 모두 충족하는 마이크로캡 종목이 없습니다. FMP 스크리너 유니버스 내에서 3년흑자·FCF+·매출CAGR·저유동성을 동시 만족하는 종목이 드뭅니다." />
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <Th className="text-left">Symbol</Th>
            <Th className="text-left">Name</Th>
            <Th>시가총액</Th>
            <Th>매출 CAGR</Th>
            <Th>FCF</Th>
            <Th>일 거래대금</Th>
          </tr>
        </thead>
        <tbody>
          {res.candidates.map((c) => (
            <tr key={c.symbol} className="border-b last:border-0">
              <Td className="text-left font-mono font-medium">{c.symbol}</Td>
              <Td className="text-left text-muted-foreground">{c.name}</Td>
              <Td className="tabular-nums">{money(c.signal.marketCap)}</Td>
              <Td className="tabular-nums text-emerald-600 dark:text-emerald-400">
                {c.signal.revenueCagrPct?.toFixed(1) ?? '—'}%
              </Td>
              <Td className="tabular-nums">{money(c.signal.freeCashFlow)}</Td>
              <Td className="tabular-nums">{money(c.signal.avgDollarVolume)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ZoneBadge({ z, zone }: { z: number; zone: AltmanZone }) {
  const tone =
    zone === 'safe'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      : zone === 'grey'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : 'bg-destructive/15 text-destructive';
  const label = zone === 'safe' ? '안전' : zone === 'grey' ? '주의' : '위험';
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs tabular-nums ${tone}`}>
      {z.toFixed(1)} {label}
    </span>
  );
}

function money(v: number | null): string {
  if (v === null) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function Th({ children, className = 'text-right' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = 'text-right' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
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
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
