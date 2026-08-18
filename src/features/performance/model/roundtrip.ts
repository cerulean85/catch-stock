import type { Trade } from '@/features/account';
import type { OpenLot, RoundTrip } from './types';

/** 체결 1건에 종목 정보를 붙인 것. accountTrades 한 줄에 해당한다. */
export interface TradeRow extends Trade {
  scope: 'domestic' | 'overseas';
  code: string;
  name: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / DAY_MS));
}

/** 매수·매도를 시간순으로 정렬한다. 같은 날이면 시각을 쓴다. */
function byTime(a: TradeRow, b: TradeRow): number {
  if (a.tradedOn !== b.tradedOn) return a.tradedOn < b.tradedOn ? -1 : 1;
  const at = a.tradedTime ?? '';
  const bt = b.tradedTime ?? '';
  if (at !== bt) return at < bt ? -1 : 1;
  // 해외 체결에는 시각이 없어 같은 날 안에서는 순서를 알 수 없다.
  // 팔려면 먼저 사야 하므로 매수를 앞에 둔다. 체결번호로 정렬하면
  // 매도가 앞서 나와 짝지을 매수가 없는 것처럼 보인다.
  if (a.side !== b.side) return a.side === 'buy' ? -1 : 1;
  return a.dealId < b.dealId ? -1 : a.dealId > b.dealId ? 1 : 0;
}

interface Lot {
  quantity: number;
  price: number;
  /** 주당 매수 수수료. */
  feePerShare: number;
  openedOn: string;
}

/**
 * 한 종목의 체결을 FIFO로 짝지어 청산 매매를 만든다.
 * 매도 수량이 보유분보다 많으면(수집 누락·이관 등) 짝지을 수 있는 만큼만 쓰고 나머지는 버린다.
 */
function matchOne(trades: TradeRow[], journaled: boolean): { closed: RoundTrip[]; open: OpenLot[] } {
  const sorted = [...trades].sort(byTime);
  const lots: Lot[] = [];
  const closed: RoundTrip[] = [];

  for (const trade of sorted) {
    if (trade.quantity <= 0) continue;

    if (trade.side === 'buy') {
      lots.push({
        quantity: trade.quantity,
        price: trade.price,
        feePerShare: (trade.fee ?? 0) / trade.quantity,
        openedOn: trade.tradedOn,
      });
      continue;
    }
    if (trade.side !== 'sell') continue;

    let remaining = trade.quantity;
    const sellFeePerShare = (trade.fee ?? 0) / trade.quantity;

    while (remaining > 0 && lots.length > 0) {
      const lot = lots[0];
      const qty = Math.min(remaining, lot.quantity);
      const fee = qty * (lot.feePerShare + sellFeePerShare);
      const cost = qty * lot.price;
      const pnl = qty * (trade.price - lot.price) - fee;

      closed.push({
        scope: trade.scope,
        code: trade.code,
        name: trade.name,
        currency: trade.currency,
        quantity: qty,
        buyPrice: lot.price,
        sellPrice: trade.price,
        fee,
        pnl,
        returnPct: cost === 0 ? 0 : (pnl / cost) * 100,
        openedOn: lot.openedOn,
        closedOn: trade.tradedOn,
        holdingDays: daysBetween(lot.openedOn, trade.tradedOn),
        journaled,
      });

      lot.quantity -= qty;
      remaining -= qty;
      if (lot.quantity === 0) lots.shift();
    }
    // 남은 매도 수량은 짝지을 매수가 없다. 매수 이력이 수집 범위 밖이라는 뜻이라 버린다.
  }

  const open: OpenLot[] = lots.map((lot) => ({
    scope: trades[0].scope,
    code: trades[0].code,
    name: trades[0].name,
    quantity: lot.quantity,
    openedOn: lot.openedOn,
  }));

  return { closed, open };
}

/**
 * 전체 체결을 종목별로 나눠 FIFO로 짝짓는다.
 * journaledCodes에 든 종목은 일지를 남긴 매매로 표시한다.
 */
export function matchRoundTrips(
  trades: TradeRow[],
  journaledCodes: Set<string>,
): { roundTrips: RoundTrip[]; openLots: OpenLot[] } {
  const groups = new Map<string, TradeRow[]>();
  for (const trade of trades) {
    const key = `${trade.scope}:${trade.code}`;
    const list = groups.get(key);
    if (list) list.push(trade);
    else groups.set(key, [trade]);
  }

  const roundTrips: RoundTrip[] = [];
  const openLots: OpenLot[] = [];
  for (const [, list] of groups) {
    const { closed, open } = matchOne(list, journaledCodes.has(list[0].code.toUpperCase()));
    roundTrips.push(...closed);
    openLots.push(...open);
  }

  // 최근 청산이 위로 오게 한다.
  roundTrips.sort((a, b) => (a.closedOn < b.closedOn ? 1 : a.closedOn > b.closedOn ? -1 : 0));
  return { roundTrips, openLots };
}
