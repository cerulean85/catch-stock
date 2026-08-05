'use client';

import { useRef, useState, useTransition } from 'react';
import { Check, ClipboardList, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLocale } from '@/features/locale';
import { NOTE_MAX, normalizeNote, type MarketNote, type NoteField } from '../model/note';
import { saveMarketNoteAction } from '../api/actions';

const FIELDS: { key: NoteField; label: string; placeholder: string }[] = [
  { key: 'preOpen', label: 'preOpenTodo', placeholder: 'preOpenTodoPlaceholder' },
  { key: 'intraday', label: 'intradayTodo', placeholder: 'intradayTodoPlaceholder' },
  { key: 'postClose', label: 'postCloseTodo', placeholder: 'postCloseTodoPlaceholder' },
];

export function MarketNoteCard({ note }: { note: MarketNote }) {
  const { t } = useLocale();
  const [saved, setSaved] = useState(note);
  const [draft, setDraft] = useState(note);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const firstFieldRef = useRef<HTMLTextAreaElement>(null);

  const startEditing = () => {
    setDraft(saved);
    setError(null);
    setEditing(true);
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  };

  const confirm = () => {
    startTransition(async () => {
      const result = await saveMarketNoteAction(draft);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(normalizeNote(draft));
      setEditing(false);
    });
  };

  return (
    <section className="rounded-lg border border-l-4 border-l-primary bg-muted/40 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ClipboardList className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold tracking-tight">{t('marketCloseTodos')}</h2>
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

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {FIELDS.map((field, index) => (
          <div key={field.key}>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t(field.label)}
            </h3>
            {editing ? (
              <div className="mt-2 space-y-1">
                <Textarea
                  ref={index === 0 ? firstFieldRef : undefined}
                  value={draft[field.key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                  placeholder={t(field.placeholder)}
                  aria-label={t(field.label)}
                  rows={5}
                  maxLength={NOTE_MAX}
                  className="bg-background text-[15px] leading-relaxed"
                />
                <p className="text-right text-xs text-muted-foreground tabular-nums">
                  {draft[field.key].length}/{NOTE_MAX}
                </p>
              </div>
            ) : (
              <NoteLines text={saved[field.key]} emptyText={t('marketCloseTodosEmpty')} />
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}

function NoteLines({ text, emptyText }: { text: string; emptyText: string }) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {lines.map((line, i) => (
        <li key={`${i}-${line}`} className="flex gap-2.5 text-[15px] leading-relaxed">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
