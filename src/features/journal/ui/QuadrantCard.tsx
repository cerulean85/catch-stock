'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/features/locale';
import type { Quadrant, QuadrantBucket } from '../model/review';

/** 칸마다 성격이 달라 색으로 구분한다. '운이 좋았음'이 가장 위험하다. */
const TONE: Record<Quadrant, string> = {
  quadrantSkill: 'border-emerald-500/40 bg-emerald-500/5',
  quadrantUnlucky: 'border-sky-500/40 bg-sky-500/5',
  quadrantLucky: 'border-amber-500/50 bg-amber-500/5',
  quadrantDeserved: 'border-red-500/40 bg-red-500/5',
};

/** 회고한 일지를 과정×결과 사분면으로 보여준다. 실력과 운을 갈라 보기 위한 것. */
export function QuadrantCard({ buckets }: { buckets: QuadrantBucket[] }) {
  const { t } = useLocale();
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('quadrantTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">{t('quadrantEmpty')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {buckets.map((bucket) => (
              <section key={bucket.key} className={`rounded-md border p-3 ${TONE[bucket.key]}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium">{t(bucket.key)}</h3>
                  <span className="text-lg font-semibold tabular-nums">{bucket.count}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{t(`${bucket.key}Hint`)}</p>
                {bucket.journals.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-0.5">
                    {bucket.journals.map((journal) => (
                      <li key={journal.id}>
                        <Link
                          href={`/journal/${journal.id}`}
                          className="block truncate text-xs hover:underline"
                        >
                          {journal.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
