'use client';

import { useRef, useState, useTransition } from 'react';
import { Check, Pencil, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/features/locale';
import { PRINCIPLE_MAX } from '../model/principle';
import { savePrincipleAction } from '../api/actions';

export function PrincipleCard({ content }: { content: string }) {
  const { t } = useLocale();
  const [saved, setSaved] = useState(content);
  const [draft, setDraft] = useState(content);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEditing = () => {
    setDraft(saved);
    setError(null);
    setEditing(true);
    // 편집 버튼을 누르면 바로 입력할 수 있도록 포커스를 옮긴다.
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const confirm = () => {
    startTransition(async () => {
      const result = await savePrincipleAction(draft);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(draft.trim());
      setEditing(false);
    });
  };

  const lines = saved
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section className="rounded-lg border border-l-4 border-l-primary bg-muted/40 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScrollText className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold tracking-tight">{t('investmentPrinciples')}</h2>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setDraft(saved);
                setError(null);
                setEditing(false);
              }}
            >
              {t('cancel')}
            </Button>
            <Button type="button" size="sm" disabled={pending} onClick={confirm}>
              <Check className="mr-1.5 h-4 w-4" />
              {pending ? t('saving') : t('confirm')}
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={startEditing}>
            <Pencil className="mr-1.5 h-4 w-4" />
            {t('principlesEdit')}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-4 space-y-1">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('principlesPlaceholder')}
            rows={6}
            maxLength={PRINCIPLE_MAX}
            className="bg-background text-[15px] leading-relaxed"
          />
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {draft.length}/{PRINCIPLE_MAX}
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : lines.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {lines.map((line, i) => (
            <li key={`${i}-${line}`} className="flex gap-2.5 text-[15px] leading-relaxed">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{t('principlesEmpty')}</p>
      )}
    </section>
  );
}
