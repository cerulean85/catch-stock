'use client';

import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/features/locale';
import { JOURNAL_CATEGORIES, type JournalCategory } from '../model/types';
import { categoryLabel } from '../model/labels';

interface Props {
  value: JournalCategory;
  onChange: (next: JournalCategory) => void;
}

/** 카테고리는 글마다 하나만 고른다. */
export function CategorySelector({ value, onChange }: Props) {
  const { t } = useLocale();

  return (
    <div className="flex flex-wrap gap-2">
      {JOURNAL_CATEGORIES.map((category) => {
        const active = value === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onChange(category)}
            aria-pressed={active}
          >
            <Badge
              variant={active ? 'default' : 'outline'}
              className="cursor-pointer select-none"
            >
              {categoryLabel(category, t)}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
