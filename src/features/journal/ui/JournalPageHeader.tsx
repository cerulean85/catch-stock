'use client';

import { useLocale } from '@/features/locale';

export function JournalPageHeader({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useLocale();

  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === 'new' ? t('newJournal') : t('editJournal')}
      </h1>
      {mode === 'new' && (
        <p className="text-sm text-muted-foreground">{t('newJournalDescription')}</p>
      )}
    </header>
  );
}
