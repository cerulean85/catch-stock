'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useLocale } from '@/features/locale';
import { InlineNoteCard } from '@/shared/ui/InlineNoteCard';
import { CRITERIA_MAX } from '../model/criteria';
import { saveRiskCriteriaAction } from '../api/actions';

/** 평가 기준 편집. 저장한 값이 다음 평가부터 그대로 Gemini에 전달된다. */
export function RiskCriteriaCard({
  criteria,
  onSaved,
}: {
  criteria: string;
  onSaved: (next: string) => void;
}) {
  const { t } = useLocale();

  return (
    <InlineNoteCard
      title={t('riskCriteria')}
      icon={<SlidersHorizontal className="h-4 w-4" />}
      fields={[{ key: 'content', placeholder: t('riskCriteriaPlaceholder') }]}
      values={{ content: criteria }}
      maxLength={CRITERIA_MAX}
      emptyText={t('riskCriteriaEmpty')}
      actionLabels={{
        edit: t('principlesEdit'),
        cancel: t('cancel'),
        confirm: t('confirm'),
        saving: t('saving'),
      }}
      onSave={async (values) => {
        const result = await saveRiskCriteriaAction(values.content);
        if (result?.error) return result.error;
        onSaved(values.content.trim());
        return null;
      }}
    />
  );
}
