'use client';

import { useLocale } from '@/features/locale';
import { formatDecimal } from '@/shared/lib/locale';
import type { TickerQuote } from '../model/symbols';
import { PILL_CLASS } from './pill';

export function MarketTicker({ quotes }: { quotes: TickerQuote[] }) {
  const locale = useLocale();

  if (quotes.length === 0) return null;

  return (
    // 폭이 모자라도 손으로 밀지 않게 자동으로 흘려보낸다.
    // 좁은 화면에서는 w-full로 줄을 바꿔 시계·링크와 겹치지 않게 한다.
    <div className="order-3 w-full min-w-0 overflow-hidden motion-reduce:overflow-x-auto sm:order-2 sm:w-auto sm:flex-1">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
        <QuoteList quotes={quotes} locale={locale} />
        {/* 끝과 시작이 이어져 보이도록 같은 목록을 한 벌 더 둔다. 읽어줄 필요는 없다. */}
        <QuoteList quotes={quotes} locale={locale} aria-hidden />
      </div>
    </div>
  );
}

function QuoteList({
  quotes,
  locale,
  ...rest
}: {
  quotes: TickerQuote[];
  locale: ReturnType<typeof useLocale>;
} & React.HTMLAttributes<HTMLUListElement>) {
  // 목록 사이 간격을 pr로 주어야 -50% 이동이 두 벌 경계와 정확히 맞는다.
  return (
    <ul className="flex shrink-0 items-center gap-2 pr-2" {...rest}>
      {quotes.map((quote) => (
        <li key={quote.label}>
          <Pill quote={quote} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

function Pill({
  quote,
  locale,
}: {
  quote: TickerQuote;
  locale: ReturnType<typeof useLocale>;
}) {
  const up = quote.changePercent > 0;
  const down = quote.changePercent < 0;
  const tone = up ? 'text-emerald-400' : down ? 'text-red-400' : 'text-neutral-400';

  return (
    <span className={PILL_CLASS}>
      <span className="font-semibold text-white">{quote.label}</span>
      <span className="tabular-nums text-neutral-300">
        {formatDecimal(quote.price, locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      <span className={`flex items-center gap-0.5 font-semibold tabular-nums ${tone}`}>
        <span aria-hidden>{down ? '▼' : '▲'}</span>
        <span className="sr-only">{down ? '하락' : up ? '상승' : '보합'}</span>
        {formatDecimal(Math.abs(quote.changePercent), locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
        %
      </span>
    </span>
  );
}
