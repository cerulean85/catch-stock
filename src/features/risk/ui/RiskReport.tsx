'use client';

import { ExternalLink } from 'lucide-react';
import { useLocale } from '@/features/locale';
import { formatDateTime } from '@/shared/lib/locale';
import type { RiskAssessment } from '../model/types';
import { RiskLevelBadge } from './RiskLevelBadge';

/** 평가 결과 하나를 그린다. 지금 막 평가한 것이든 과거 이력이든 같은 모양이다. */
export function RiskReport({ assessment }: { assessment: RiskAssessment }) {
  const locale = useLocale();
  const { t } = locale;

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-md border border-l-4 border-l-primary bg-muted/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('riskOverall')}</h3>
          <RiskLevelBadge level={assessment.level} />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {t('riskEvaluatedAt')} {formatDateTime(assessment.createdAt, locale)}
        </p>
        {assessment.summary && <p className="mt-2 text-sm leading-relaxed">{assessment.summary}</p>}
      </section>

      {assessment.sections.map((section) => (
        <section key={section.title} className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">{section.title}</h3>
            <RiskLevelBadge level={section.level} />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
        </section>
      ))}

      {assessment.watchlist.length > 0 && (
        <section className="rounded-md border p-3">
          <h3 className="text-sm font-medium">{t('riskWatchlist')}</h3>
          <ul className="mt-1.5 space-y-1.5">
            {assessment.watchlist.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {assessment.sources.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-muted-foreground">{t('riskSources')}</h3>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {assessment.sources.map((source) => (
              <li key={source.uri}>
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  {source.title}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 검색을 안 돌렸으면 학습된 지식만으로 답한 것이라 최신 정보가 빠졌을 수 있다. */}
      {!assessment.searched && <p className="text-xs text-amber-600">{t('riskNoSearch')}</p>}

      <p className="text-xs text-muted-foreground">
        {t('riskDisclaimer')} ({assessment.model})
      </p>
    </div>
  );
}
