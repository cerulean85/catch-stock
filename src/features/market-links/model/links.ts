export interface MarketLink {
  name: string;
  href: string;
  /** 파비콘을 받아올 도메인. */
  domain: string;
  /** 실시간 방송. 같은 사이트의 일반 페이지와 로고가 겹쳐서 따로 표시가 필요하다. */
  live?: boolean;
}

export const MARKET_LINKS: MarketLink[] = [
  { name: '세이브', href: 'https://www.saveticker.com', domain: 'saveticker.com' },
  { name: 'Bloomberg', href: 'https://www.bloomberg.com/', domain: 'bloomberg.com' },
  { name: 'Reuters', href: 'https://www.reuters.com/', domain: 'reuters.com' },
  {
    name: '토스증권 (US)',
    href: 'https://www.tossinvest.com/?market=us',
    domain: 'tossinvest.com',
  },
  {
    name: '오선 미국 증시 라이브',
    href: 'https://www.youtube.com/@futuresnow',
    domain: 'youtube.com',
    live: true,
  },
  {
    name: 'Bloomberg TV',
    href: 'https://www.bloomberg.com/live/us',
    domain: 'bloomberg.com',
    live: true,
  },
];

/** 사이트 로고. 각 사이트가 파비콘을 제공하는 형식이 제각각이라 공개 서비스를 거친다. */
export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

/** 로고를 못 받았을 때 대신 쓰는 한 글자. */
export function monogram(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}
