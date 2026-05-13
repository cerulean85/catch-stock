'use client';

import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxCount?: number;
  transform?: (raw: string) => string;
  ariaLabel?: string;
}

export function ChipInput({
  values,
  onChange,
  placeholder,
  maxCount,
  transform,
  ariaLabel,
}: Props) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const next = transform ? transform(trimmed) : trimmed;
    if (!next) return;
    if (values.includes(next)) {
      setDraft('');
      return;
    }
    if (maxCount != null && values.length >= maxCount) return;
    onChange([...values, next]);
    setDraft('');
  };

  const remove = (target: string) => {
    onChange(values.filter((v) => v !== target));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      e.preventDefault();
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5"
        aria-label={ariaLabel}
      >
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 pr-1">
            <span>{v}</span>
            <button
              type="button"
              onClick={() => remove(v)}
              aria-label={`${v} 제거`}
              className="rounded-sm hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : undefined}
          className="h-7 flex-1 min-w-[8ch] border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
      </div>
      {maxCount != null && (
        <p className="text-xs text-muted-foreground">
          {values.length}/{maxCount}
        </p>
      )}
    </div>
  );
}
