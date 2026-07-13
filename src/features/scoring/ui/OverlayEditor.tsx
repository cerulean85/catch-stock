'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { fetchOverlay, saveOverlay, clearOverlay, type OverlayValues } from '../api/client';

const NUMERIC_FIELDS = [
  { key: 'moat', label: '경제적 해자' },
  { key: 'tam', label: '시장규모(TAM)' },
  { key: 'governance', label: '지배구조' },
  { key: 'geopolitical', label: '지정학 리스크' },
  { key: 'institutionalChange', label: '기관 수급 변화' },
] as const;

const EMPTY: OverlayValues = {
  moat: null,
  tam: null,
  governance: null,
  geopolitical: null,
  institutionalChange: null,
  riskTag: null,
};

type FieldKey = (typeof NUMERIC_FIELDS)[number]['key'];

/**
 * 정성 기준 수동 오버레이 편집기 — 유저별로 저장하고, 저장 시 상위에서 종목을 재조회한다.
 * 미로그인 시 안내만 노출한다.
 */
export function OverlayEditor({
  symbol,
  onSaved,
}: {
  symbol: string;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<OverlayValues>(EMPTY);
  const [authenticated, setAuthenticated] = useState(true);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetchOverlay(symbol)
      .then((res) => {
        if (!active) return;
        setAuthenticated(res.authenticated);
        setValues(res.overlay ?? EMPTY);
        setStatus('ready');
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'unknown');
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [symbol]);

  const setNumeric = (key: FieldKey, raw: string) => {
    setValues((v) => ({ ...v, [key]: raw === '' ? null : Number(raw) }));
  };

  const handleSave = async () => {
    setStatus('saving');
    setError(null);
    try {
      const saved = await saveOverlay(symbol, values);
      setValues(saved);
      setStatus('ready');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown');
      setStatus('error');
    }
  };

  const handleClear = async () => {
    setStatus('saving');
    setError(null);
    try {
      await clearOverlay(symbol);
      setValues(EMPTY);
      setStatus('ready');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown');
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return <div className="text-xs text-muted-foreground">오버레이 불러오는 중…</div>;
  }

  if (!authenticated) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        정성 기준(해자·TAM·지배구조·지정학)을 직접 저장하려면 로그인하세요. 미설정 시 엔진이 중립 3점을 적용합니다.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">수동 오버레이</span>
        <span className="text-[11px] text-muted-foreground">미설정=자동(중립 3점)</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NUMERIC_FIELDS.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{f.label}</span>
            <select
              value={values[f.key] ?? ''}
              onChange={(e) => setNumeric(f.key, e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-xs text-foreground"
            >
              <option value="">자동</option>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="flex items-center justify-between gap-2 text-xs sm:col-span-2 lg:col-span-3">
          <span className="shrink-0 text-muted-foreground">리스크 메모</span>
          <input
            type="text"
            value={values.riskTag ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, riskTag: e.target.value || null }))}
            placeholder="예: 규제 리스크 관찰 중"
            maxLength={200}
            className="w-full rounded-md border bg-background px-2 py-1 text-xs text-foreground"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" disabled={status === 'saving'} onClick={() => void handleSave()}>
          {status === 'saving' ? '저장 중…' : '저장 후 재계산'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={status === 'saving'}
          onClick={() => void handleClear()}
        >
          초기화
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  );
}
