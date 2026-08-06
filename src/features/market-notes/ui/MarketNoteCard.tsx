'use client';

import { ClipboardList } from 'lucide-react';
import { useLocale } from '@/features/locale';
import { InlineNoteCard } from '@/shared/ui/InlineNoteCard';
import { NOTE_MAX, EMPTY_NOTE, type MarketNote, type NoteField } from '../model/note';
import { saveMarketNoteAction } from '../api/actions';

const FIELDS: { key: NoteField; label: string; placeholder: string }[] = [
  { key: 'preOpen', label: 'preOpenTodo', placeholder: 'preOpenTodoPlaceholder' },
  { key: 'intraday', label: 'intradayTodo', placeholder: 'intradayTodoPlaceholder' },
  { key: 'postClose', label: 'postCloseTodo', placeholder: 'postCloseTodoPlaceholder' },
];

export function MarketNoteCard({ note }: { note: MarketNote }) {
  const { t } = useLocale();

  return (
    <InlineNoteCard
      title={t('marketCloseTodos')}
      icon={<ClipboardList className="h-4 w-4" />}
      fields={FIELDS.map((f) => ({
        key: f.key,
        label: t(f.label),
        placeholder: t(f.placeholder),
      }))}
      values={note}
      maxLength={NOTE_MAX}
      emptyText={t('marketCloseTodosEmpty')}
      actionLabels={{
        edit: t('principlesEdit'),
        cancel: t('cancel'),
        confirm: t('confirm'),
        saving: t('saving'),
      }}
      onSave={async (values) => {
        const result = await saveMarketNoteAction({ ...EMPTY_NOTE, ...values } as MarketNote);
        return result?.error ?? null;
      }}
    />
  );
}
