'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkPending } from '@/shared/ui/LinkPending';
import { useLocale } from '@/features/locale';
import { formatDateTime } from '@/shared/lib/locale';
import type { Journal } from '../model/types';
import { JournalPinButton } from './JournalPinButton';
import {
  categoryLabel,
  horizonLabel,
  riskCheckLabel,
  sentimentLabel,
  tradeTypeLabel,
} from '../model/labels';

function excerpt(text: string, max = 140): string {
  const flat = text.replace(/[#*>`_~\-\[\]]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export function JournalCard({ journal }: { journal: Journal }) {
  const locale = useLocale();
  const { t } = locale;

  return (
    // 핀 버튼은 링크 안에 넣을 수 없어 밖에 두고 위치만 겹친다.
    <div className="relative h-full">
      <Link
        href={`/journal/${journal.id}`}
        className="relative block h-full rounded-xl transition-colors hover:bg-muted/30"
      >
      <LinkPending />
      <Card className={`h-full ${journal.pinned ? 'border-primary/40' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="line-clamp-2 pr-8 text-base sm:text-lg">
            {journal.status === 'draft' && (
              <Badge variant="outline" className="mr-1.5 align-middle text-[10px] text-amber-600 dark:text-amber-400">
                {t('statusDraft')}
              </Badge>
            )}
            {journal.title}
          </CardTitle>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            <Badge variant="secondary" className="text-[10px]">
              {categoryLabel(journal.category, t)}
            </Badge>
            {formatDateTime(journal.tradedAt, locale)}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {excerpt(journal.content) && (
            <p className="line-clamp-3 text-sm text-foreground/80">{excerpt(journal.content)}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {journal.tickers.slice(0, 6).map((t) => (
              <Badge key={t} variant="secondary" className="font-mono text-[11px]">
                {t}
              </Badge>
            ))}
            {journal.tradeTypes.map((t) => (
              <Badge key={t} variant="outline" className="text-[11px]">
                {tradeTypeLabel(t, locale.t)}
              </Badge>
            ))}
          </div>
          {journal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {journal.tags.slice(0, 6).map((tag) => (
                <span key={tag} className="text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {journal.riskChecks.length > 0 && (
            <div className="line-clamp-1 text-[11px] text-muted-foreground">
              {t('riskCheckPrefix')}: {journal.riskChecks.map((check) => riskCheckLabel(check, t)).join(', ')}
            </div>
          )}
          {(journal.sentiment != null || journal.horizon) && (
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              {journal.sentiment != null && (
                <span>{t('sentiment')}: {sentimentLabel(journal.sentiment, t)}</span>
              )}
              {journal.horizon && <span>{t('horizon')}: {horizonLabel(journal.horizon, t)}</span>}
            </div>
          )}
        </CardContent>
      </Card>
      </Link>
      <JournalPinButton
        id={journal.id}
        pinned={journal.pinned}
        className="absolute top-3 right-3"
      />
    </div>
  );
}
