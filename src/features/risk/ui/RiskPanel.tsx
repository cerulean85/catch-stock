'use client';

import { useEffect, useState, useTransition } from 'react';
import { History, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import { formatDateTime } from '@/shared/lib/locale';
import type { Holding } from '@/features/account';
import { evaluateRiskAction, listRiskAssessmentsAction } from '../api/actions';
import type { RiskAssessment } from '../model/types';
import { RiskCriteriaCard } from './RiskCriteriaCard';
import { RiskLevelBadge } from './RiskLevelBadge';
import { RiskReport } from './RiskReport';

/** 종목 상세의 '리스크' 탭. 평가는 버튼을 누를 때만 돌리고, 결과는 이력으로 쌓인다. */
export function RiskPanel({ holding, criteria }: { holding: Holding; criteria: string }) {
  const { t } = useLocale();
  const [history, setHistory] = useState<RiskAssessment[]>([]);
  const [shownId, setShownId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(criteria);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listRiskAssessmentsAction(holding.scope, holding.code)
      .then((rows) => {
        // 종목이 바뀌면 늦게 도착한 응답은 버린다.
        if (cancelled) return;
        setHistory(rows);
        setShownId(rows[0]?.id ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [holding.scope, holding.code]);

  const evaluate = () => {
    setError(null);
    startTransition(async () => {
      const result = await evaluateRiskAction(holding.scope, holding.code);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setHistory((rows) => [result.data, ...rows]);
      setShownId(result.data.id);
    });
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <RiskCriteriaCard
          criteria={current}
          onSaved={(next) => {
            setCurrent(next);
            setEditing(false);
          }}
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
          {t('back')}
        </Button>
      </div>
    );
  }

  const shown = history.find((item) => item.id === shownId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={evaluate} className="flex-1">
          <ShieldAlert className="mr-1.5 h-4 w-4" />
          {pending ? t('riskEvaluating') : history.length > 0 ? t('riskReevaluate') : t('riskEvaluate')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setEditing(true)}
          aria-label={t('riskCriteria')}
          title={t('riskCriteria')}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {pending && <p className="py-6 text-center text-sm text-muted-foreground">{t('riskWait')}</p>}

      {!pending && loaded && !shown && !error && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('riskIntro')}
        </p>
      )}

      {!pending && shown && <RiskReport assessment={shown} />}

      {history.length > 1 && (
        <RiskHistory items={history} shownId={shownId} onSelect={setShownId} />
      )}
    </div>
  );
}

/** 과거 평가 목록. 누르면 그 시점의 평가를 그대로 다시 보여준다. */
function RiskHistory({
  items,
  shownId,
  onSelect,
}: {
  items: RiskAssessment[];
  shownId: string | null;
  onSelect: (id: string) => void;
}) {
  const locale = useLocale();
  const { t } = locale;

  return (
    <section>
      <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        {t('riskHistory')}
      </h3>
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={item.id === shownId}
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs ${
                item.id === shownId ? 'bg-muted font-medium' : 'hover:bg-muted/50'
              }`}
            >
              <span className="tabular-nums">{formatDateTime(item.createdAt, locale)}</span>
              <RiskLevelBadge level={item.level} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
