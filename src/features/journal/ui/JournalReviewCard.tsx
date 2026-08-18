'use client';

import { useState, useTransition } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/features/locale';
import { formatDateTime, formatDecimal } from '@/shared/lib/locale';
import { effectiveReturn } from '../model/metrics';
import { PROCESS_SCORE_MAX, PROCESS_SCORE_MIN, REVIEW_NOTE_MAX, quadrantOf } from '../model/review';
import type { Journal } from '../model/types';
import { saveJournalReviewAction } from '../api/actions';

/** 이 일지의 종목으로 실제 청산된 매매를 합친 것. 없으면 null. */
export interface RealizedSummary {
  count: number;
  pnl: number;
  currency: string;
  returnPct: number;
}

/**
 * 판단 → 결과 회고. 결과(수익/손실)는 계산해서 보여주고,
 * 사용자는 결과와 무관하게 '판단 과정이 타당했는가'만 매긴다.
 */
export function JournalReviewCard({
  journal,
  realized,
}: {
  journal: Journal;
  realized: RealizedSummary | null;
}) {
  const locale = useLocale();
  const { t } = locale;
  const [score, setScore] = useState<number | null>(journal.processScore);
  const [note, setNote] = useState(journal.reviewNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const result = effectiveReturn(journal);
  const quadrant = quadrantOf({ ...journal, processScore: score });
  const due = journal.reviewAt != null && journal.reviewedAt == null;

  const save = () => {
    if (score == null) {
      setError(t('reviewPickScore'));
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveJournalReviewAction(journal.id, score, note);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <section
      className={`rounded-lg border p-4 ${due ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardCheck className="h-4 w-4" />
          {t('reviewTitle')}
        </h2>
        {journal.reviewedAt ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {t('reviewDoneAt')} {formatDateTime(journal.reviewedAt, locale)}
          </span>
        ) : (
          journal.reviewAt && (
            <span className="text-xs text-amber-700 dark:text-amber-300 tabular-nums">
              {t('reviewDate')} {formatDateTime(journal.reviewAt, locale)}
            </span>
          )
        )}
      </header>

      {/* 결과 축 — 사용자가 매기는 게 아니라 계산된 값이다. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-xs text-muted-foreground uppercase">{t('reviewResult')}</span>
        {result == null ? (
          <span className="text-muted-foreground">{t('reviewNoResult')}</span>
        ) : (
          <span
            className={`font-semibold tabular-nums ${
              result > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : result < 0
                  ? 'text-red-600 dark:text-red-400'
                  : ''
            }`}
          >
            {result > 0 ? '+' : ''}
            {formatDecimal(result, locale, { maximumFractionDigits: 2 })}%
          </span>
        )}
        {realized && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {t('reviewRealized')}{' '}
            <span className={realized.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {realized.pnl > 0 ? '+' : ''}
              {formatDecimal(realized.pnl, locale, {
                maximumFractionDigits: realized.currency === 'KRW' ? 0 : 2,
              })}{' '}
              {realized.currency}
            </span>{' '}
            ({realized.count}
            {t('reviewRealizedCount')})
          </span>
        )}
      </div>

      {/* 과정 축 — 결과와 별개로 판단이 타당했는지. */}
      <div className="mt-3">
        <p className="text-xs text-muted-foreground uppercase">{t('reviewProcess')}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {Array.from({ length: PROCESS_SCORE_MAX - PROCESS_SCORE_MIN + 1 }, (_, i) => {
            const value = PROCESS_SCORE_MIN + i;
            const active = score === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                aria-label={`${t('reviewProcess')} ${value}`}
                onClick={() => setScore(value)}
                className={`h-8 w-8 rounded-md border text-sm tabular-nums ${
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                {value}
              </button>
            );
          })}
          <span className="ml-1 text-xs text-muted-foreground">{t('reviewProcessHint')}</span>
        </div>
      </div>

      {quadrant && (
        <p className="mt-3">
          <Badge variant="outline">{t(quadrant)}</Badge>
          <span className="ml-2 text-xs text-muted-foreground">{t(`${quadrant}Hint`)}</span>
        </p>
      )}

      <div className="mt-3 space-y-1">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('reviewNotePlaceholder')}
          rows={3}
          maxLength={REVIEW_NOTE_MAX}
          aria-label={t('reviewNoteLabel')}
          className="bg-background"
        />
        <p className="text-right text-xs text-muted-foreground tabular-nums">
          {note.length}/{REVIEW_NOTE_MAX}
        </p>
      </div>

      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

      <div className="mt-2 flex justify-end">
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? t('saving') : journal.reviewedAt ? t('reviewUpdate') : t('reviewSave')}
        </Button>
      </div>
    </section>
  );
}
