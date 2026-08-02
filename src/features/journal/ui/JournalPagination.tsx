'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';

export function JournalPagination({ page, pageCount }: { page: number; pageCount: number }) {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  if (pageCount <= 1) return null;

  const goto = (next: number) => {
    const sp = new URLSearchParams(params.toString());
    if (next <= 1) sp.delete('page');
    else sp.set('page', String(next));
    const qs = sp.toString();
    router.replace(qs ? `/journal?${qs}` : '/journal');
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => goto(page - 1)}>
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('prev')}
      </Button>
      <span className="text-sm tabular-nums text-muted-foreground">
        {page} / {pageCount}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => goto(page + 1)}
      >
        {t('next')}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
