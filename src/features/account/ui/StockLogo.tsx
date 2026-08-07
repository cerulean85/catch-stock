'use client';

import { useState } from 'react';
import { logoUrl, monogram } from '../model/logo';

/**
 * 종목 로고. 해외 티커는 공개 CDN에서 받아오고, 국내 종목이거나 로고가 없으면
 * 종목명 첫 글자 배지로 대체한다. 로딩 실패도 같은 배지로 떨어진다.
 */
export function StockLogo({ code, name }: { code: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const url = logoUrl(code);

  if (!url || failed) {
    return (
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
      >
        {monogram(name, code)}
      </span>
    );
  }

  return (
    // next/image를 쓰면 원격 호스트 설정과 최적화 프록시가 필요한데, 24px 아이콘에는 과하다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={24}
      height={24}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-6 w-6 shrink-0 rounded-full bg-muted object-contain"
    />
  );
}
