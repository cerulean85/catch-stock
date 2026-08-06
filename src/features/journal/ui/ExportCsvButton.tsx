'use client';

import { useTransition } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import { exportJournalsCsvAction } from '../api/actions';
import type { JournalFilters } from '../model/types';
import { downloadText } from './download';

export function ExportCsvButton({
  filters,
  disabled,
}: {
  filters: JournalFilters;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const csv = await exportJournalsCsvAction(filters);
          downloadText('journals.csv', csv, 'text/csv');
        })
      }
    >
      <Download className="mr-1.5 h-4 w-4" />
      {pending ? t('exporting') : t('exportCsv')}
    </Button>
  );
}
