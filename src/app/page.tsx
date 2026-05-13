import { ScreenerView } from '@/features/screener';
import { LiquidityView } from '@/features/liquidity';
import { NewsView } from '@/features/news';
import { WatchlistView } from '@/features/watchlist';

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <NewsView />
      <WatchlistView />
      <LiquidityView />
      <ScreenerView />
    </div>
  );
}
