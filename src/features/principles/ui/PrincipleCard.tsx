'use client';

import { ScrollText } from 'lucide-react';
import { useLocale } from '@/features/locale';
import { InlineNoteCard } from '@/shared/ui/InlineNoteCard';
import { PRINCIPLE_MAX } from '../model/principle';
import { savePrincipleAction } from '../api/actions';

const FIELDS = [{ key: 'content', placeholder: 'principlesPlaceholder' }];

export function PrincipleCard({ content }: { content: string }) {
  const { t } = useLocale();

  return (
    <InlineNoteCard
      title={t('investmentPrinciples')}
      icon={<ScrollText className="h-4 w-4" />}
      fields={FIELDS.map((f) => ({ ...f, placeholder: t(f.placeholder) }))}
      values={{ content }}
      maxLength={PRINCIPLE_MAX}
      emptyText={t('principlesEmpty')}
      actionLabels={{
        edit: t('principlesEdit'),
        cancel: t('cancel'),
        confirm: t('confirm'),
        saving: t('saving'),
      }}
      onSave={async (values) => {
        const result = await savePrincipleAction(values.content);
        return result?.error ?? null;
      }}
    />
  );
}
