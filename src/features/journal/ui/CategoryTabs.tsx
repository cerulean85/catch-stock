'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import { JOURNAL_CATEGORIES, type JournalCategory } from '../model/types';
import { categoryLabel } from '../model/labels';

/** 카테고리는 가장 자주 바꾸는 필터라 셀렉트에 넣지 않고 항상 보이는 탭으로 둔다. */
export function CategoryTabs() {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get('category') ?? '';

  const select = (next: JournalCategory | '') => {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set('category', next);
    else sp.delete('category');
    sp.delete('page');
    const qs = sp.toString();
    router.replace(qs ? `/journal?${qs}` : '/journal');
  };

  const options: { value: JournalCategory | ''; label: string }[] = [
    { value: '', label: t('categoryAll') },
    ...JOURNAL_CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c, t) })),
  ];

  return (
    <div className="flex flex-wrap gap-0.5 rounded-lg border bg-muted/40 p-1">
      {options.map(({ value, label }) => (
        <Button
          key={value || 'all'}
          type="button"
          size="sm"
          variant={active === value ? 'secondary' : 'ghost'}
          className={active === value ? 'shadow-sm' : 'text-muted-foreground'}
          aria-pressed={active === value}
          onClick={() => select(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
