'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { fetchScore } from '../api/client';
import type { ScoreResult } from '../model/types';
import { OverlayEditor } from './OverlayEditor';

/** 종목 상세 스코어 — 영역별 기준 브레이크다운 + 강점/리스크 + 수동 오버레이 편집. */
export function ScoreDetail({
  symbol,
  preset,
  detail: initialDetail,
}: {
  symbol: string;
  preset: string;
  detail: ScoreResult;
}) {
  const [detail, setDetail] = useState<ScoreResult>(initialDetail);

  const refresh = async () => {
    try {
      setDetail(await fetchScore(symbol, preset));
    } catch {
      // 재조회 실패 시 기존 상세 유지(오버레이는 이미 저장됨).
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-muted/30 p-4">
      {/* 종합 요약 */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">{detail.summary.headline}</span>
        {detail.summary.strengths.length > 0 && (
          <span className="text-xs text-muted-foreground">
            강점: {detail.summary.strengths.join(', ')}
          </span>
        )}
        {detail.summary.risks.length > 0 && (
          <span className="text-xs text-destructive">
            리스크: {detail.summary.risks.join(', ')}
          </span>
        )}
      </div>

      <OverlayEditor symbol={symbol} onSaved={() => void refresh()} />

      {/* 영역별 기준 */}
      <div className="grid gap-4 md:grid-cols-2">
        {detail.areas.map((area) => {
          const crits = detail.criteria.filter((c) => c.area === area.area);
          return (
            <div key={area.area} className="rounded-md border bg-background p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{area.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {area.score !== null ? `${area.score.toFixed(2)}/5` : '—'} · 가중치{' '}
                  {(area.weight * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">{area.insight}</p>
              <ul className="flex flex-col gap-1.5">
                {crits.map((c) => (
                  <li key={c.key} className="flex items-start justify-between gap-2 text-xs">
                    <span className="flex-1">
                      <span className="text-muted-foreground">#{c.number}</span> {c.nameKo}
                      <span className="block text-[11px] text-muted-foreground">
                        {c.interpretation}
                      </span>
                    </span>
                    <SubscoreBadge value={c.subscore} isDefault={c.isDefault} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubscoreBadge({ value, isDefault }: { value: number | null; isDefault: boolean }) {
  if (value === null) {
    return (
      <Badge variant="outline" className="shrink-0 text-muted-foreground">
        —
      </Badge>
    );
  }
  const variant = value >= 3.5 ? 'default' : value <= 2 ? 'destructive' : 'secondary';
  return (
    <Badge variant={variant} className="shrink-0 tabular-nums">
      {value.toFixed(1)}
      {isDefault ? '*' : ''}
    </Badge>
  );
}
