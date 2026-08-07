'use client';

import { useState, useTransition } from 'react';
import { Pin, PinOff } from 'lucide-react';
import { useLocale } from '@/features/locale';
import { setJournalPinnedAction } from '../api/actions';

/**
 * 목록의 카드·행 위에 겹쳐 두는 고정 토글.
 * 카드 전체가 링크라 그 안에 버튼을 넣을 수 없어서, 링크 밖에 두고 위치만 겹친다.
 */
export function JournalPinButton({
  id,
  pinned,
  className = '',
}: {
  id: string;
  pinned: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  // 서버 재검증까지 기다리면 반응이 굼떠 보여서 눌린 즉시 상태를 바꾼다.
  const [on, setOn] = useState(pinned);
  const [, startTransition] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      await setJournalPinnedAction(id, next);
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? t('unpinJournal') : t('pinJournal')}
      title={on ? t('unpinJournal') : t('pinJournal')}
      className={`group/pin rounded-md p-1.5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
        on ? 'text-primary' : 'text-muted-foreground/50 hover:text-foreground'
      } ${className}`}
    >
      {on ? (
        <>
          <Pin className="h-4 w-4 fill-current group-hover/pin:hidden" />
          <PinOff className="hidden h-4 w-4 group-hover/pin:block" />
        </>
      ) : (
        <Pin className="h-4 w-4" />
      )}
    </button>
  );
}
