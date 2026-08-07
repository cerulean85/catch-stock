import { MarketLinks } from '@/features/market-links';
import { getTickerQuotes } from '../api/server';
import { MarketTicker } from './MarketTicker';
import { UsClock } from './UsClock';

/**
 * 모든 페이지 최상단 띠. 시계·지표·외부 링크를 한 줄에 담는다.
 * 지표는 시세를 못 받으면 빠지지만 시계와 링크는 그대로 남는다.
 */
export async function MarketTickerBar() {
  const quotes = await getTickerQuotes();

  return (
    <div className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
        <UsClock />
        <MarketTicker quotes={quotes} />
        <MarketLinks />
      </div>
    </div>
  );
}
