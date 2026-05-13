'use client';

import { useState } from 'react';
import { Eye, Pencil, Columns2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/features/locale';
import { MarkdownPreview } from './MarkdownPreview';

type Mode = 'edit' | 'preview' | 'split';

interface Props {
  name: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({ name, value, onChange, placeholder }: Props) {
  const { t } = useLocale();
  const [mode, setMode] = useState<Mode>('split');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant={mode === 'edit' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('edit')}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t('editMode')}
        </Button>
        <Button
          type="button"
          variant={mode === 'split' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('split')}
          className="hidden sm:inline-flex"
        >
          <Columns2 className="mr-1.5 h-3.5 w-3.5" /> {t('splitMode')}
        </Button>
        <Button
          type="button"
          variant={mode === 'preview' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('preview')}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" /> {t('preview')}
        </Button>
      </div>

      <div
        className={
          mode === 'split'
            ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
            : 'grid grid-cols-1 gap-3'
        }
      >
        {(mode === 'edit' || mode === 'split') && (
          <Textarea
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[28rem] font-mono text-sm"
          />
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div className="min-h-[28rem] rounded-md border bg-card p-4">
            <MarkdownPreview content={value} />
          </div>
        )}
      </div>
    </div>
  );
}
