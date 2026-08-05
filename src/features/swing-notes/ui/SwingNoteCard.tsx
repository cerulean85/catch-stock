'use client';

import { Target } from 'lucide-react';
import { useLocale } from '@/features/locale';
import { InlineNoteCard } from '@/shared/ui/InlineNoteCard';
import { SWING_NOTE_MAX } from '../model/note';
import { saveSwingNoteAction } from '../api/actions';

export function SwingNoteCard({ content }: { content: string }) {
  const { t } = useLocale();

  return (
    <InlineNoteCard
      title={t('swingGoldilocks')}
      icon={<Target className="h-4 w-4" />}
      fields={[{ key: 'content', placeholder: t('swingGoldilocksPlaceholder') }]}
      values={{ content }}
      maxLength={SWING_NOTE_MAX}
      emptyText={t('swingGoldilocksEmpty')}
      actionLabels={{
        edit: t('principlesEdit'),
        cancel: t('cancel'),
        confirm: t('confirm'),
        saving: t('saving'),
      }}
      onSave={async (values) => {
        const result = await saveSwingNoteAction(values.content);
        return result?.error ?? null;
      }}
    />
  );
}
