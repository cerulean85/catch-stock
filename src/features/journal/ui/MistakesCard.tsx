'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/features/locale';
import type { Mistake } from '../model/mistakes';

export function MistakesCard({ mistakes }: { mistakes: Mistake[] }) {
  const { t } = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {t('mistakesTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mistakes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('mistakesEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {mistakes.map((m, i) => (
              <li key={`${m.key}-${m.detail ?? i}`} className="rounded-md border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {t(m.key)}
                    {m.detail && (
                      <Badge variant="secondary" className="ml-2 font-mono text-[11px]">
                        {m.detail}
                      </Badge>
                    )}
                  </span>
                  <span className="text-sm tabular-nums text-amber-600 dark:text-amber-400">
                    {m.count}
                    {t('occurrenceSuffix')}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {m.samples.map((s) => (
                    <Link key={s.id} href={`/journal/${s.id}`} className="truncate hover:underline">
                      {s.title}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
