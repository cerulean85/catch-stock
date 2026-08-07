'use client';

import { useState } from 'react';
import { useLocale } from '@/features/locale';
import { faviconUrl, monogram, MARKET_LINKS, type MarketLink } from '../model/links';

/** 상단 바 오른쪽에 붙는 외부 시장 자료 링크. 로고만 두고 이름은 툴팁으로 보여준다. */
export function MarketLinks() {
  const { t } = useLocale();

  return (
    <nav aria-label={t('marketLinks')} className="order-2 flex items-center gap-1.5 sm:order-3">
      {MARKET_LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          title={link.name}
          aria-label={link.name}
          className="relative rounded-md p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <SiteLogo link={link} />
          {link.live ? (
            // 블룸버그 본 사이트와 TV가 같은 로고라서, 라이브는 붉은 점으로 구분한다.
            <span
              aria-hidden
              className="absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background"
            />
          ) : null}
        </a>
      ))}
    </nav>
  );
}

function SiteLogo({ link }: { link: MarketLink }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        className="flex h-5 w-5 items-center justify-center rounded-sm bg-muted text-[10px] font-semibold text-muted-foreground"
      >
        {monogram(link.name)}
      </span>
    );
  }

  return (
    // 20px 아이콘이라 next/image의 원격 호스트 설정·최적화 프록시는 과하다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={faviconUrl(link.domain)}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-5 w-5 rounded-sm object-contain"
    />
  );
}
