'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';

/** 이전 페이지로 돌아간다. 방문 기록이 없으면 일지 목록으로 이동한다. */
export function JournalBackButton() {
  const router = useRouter();
  const { t } = useLocale();

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/journal');
  };

  return (
    <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={goBack}>
      <ArrowLeft className="mr-1.5 h-4 w-4" />
      {t('back')}
    </Button>
  );
}
