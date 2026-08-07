'use client';

import { useSyncExternalStore } from 'react';
import { useLocale } from '@/features/locale';
import { formatUsMarketTime } from '../model/clock';
import { PILL_CLASS } from './pill';

const PLACEHOLDER = '--/-- --:--:--';

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
}

// useSyncExternalStore는 같은 값이면 같은 문자열을 돌려줘야 해서 직전 값을 들고 있는다.
let lastTime = PLACEHOLDER;

function getSnapshot() {
  const now = formatUsMarketTime(new Date());
  if (now !== lastTime) lastTime = now;
  return lastTime;
}

// 서버에는 '지금'이 없으므로 자리표시자를 그리고 마운트 후에 실제 시각으로 바뀐다.
function getServerSnapshot() {
  return PLACEHOLDER;
}

/** 지표 좌측에 붙는 미국 현지시각 시계. */
export function UsClock() {
  const { t } = useLocale();
  const time = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <span className={`order-1 ${PILL_CLASS}`}>
      <span className="font-semibold text-white">{t('usMarketTime')}</span>
      <time className="tabular-nums text-neutral-300">{time}</time>
    </span>
  );
}
