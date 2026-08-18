import { describe, expect, it } from 'vitest';
import { matchRoundTrips, type TradeRow } from './roundtrip';

let seq = 0;
function trade(
  side: 'buy' | 'sell',
  tradedOn: string,
  quantity: number,
  price: number,
  extra: Partial<TradeRow> = {},
): TradeRow {
  seq += 1;
  return {
    scope: 'overseas',
    code: 'AAPL',
    name: 'Apple',
    tradedOn,
    tradedTime: null,
    dealId: `d${String(seq).padStart(4, '0')}`,
    side,
    sideLabel: null,
    quantity,
    price,
    amount: quantity * price,
    fee: null,
    currency: 'USD',
    ...extra,
  };
}

const NONE = new Set<string>();

describe('matchRoundTrips', () => {
  it('매수-매도를 하나의 완결된 매매로 묶는다', () => {
    // ideas.md의 예: 3/10 10주 @180 매수 → 5/2 10주 @210 매도
    const { roundTrips, openLots } = matchRoundTrips(
      [trade('buy', '2026-03-10', 10, 180), trade('sell', '2026-05-02', 10, 210)],
      NONE,
    );

    expect(roundTrips).toHaveLength(1);
    const [trip] = roundTrips;
    expect(trip.pnl).toBe(300);
    expect(trip.returnPct).toBeCloseTo(16.67, 2);
    expect(trip.holdingDays).toBe(53);
    expect(trip.openedOn).toBe('2026-03-10');
    expect(trip.closedOn).toBe('2026-05-02');
    expect(openLots).toHaveLength(0);
  });

  it('먼저 산 물량부터 판다 (FIFO)', () => {
    const { roundTrips } = matchRoundTrips(
      [
        trade('buy', '2026-01-01', 10, 100),
        trade('buy', '2026-02-01', 10, 200),
        trade('sell', '2026-03-01', 10, 150),
      ],
      NONE,
    );

    // 평균가 150이 아니라 먼저 산 100짜리와 짝지어 +500이어야 한다.
    expect(roundTrips).toHaveLength(1);
    expect(roundTrips[0].buyPrice).toBe(100);
    expect(roundTrips[0].pnl).toBe(500);
  });

  it('한 번의 매도가 여러 매수에 걸치면 나눠서 짝짓는다', () => {
    const { roundTrips } = matchRoundTrips(
      [
        trade('buy', '2026-01-01', 10, 100),
        trade('buy', '2026-02-01', 10, 200),
        trade('sell', '2026-03-01', 15, 150),
      ],
      NONE,
    );

    expect(roundTrips.map((t) => [t.quantity, t.buyPrice, t.pnl])).toEqual([
      [10, 100, 500],
      [5, 200, -250],
    ]);
  });

  it('안 판 물량은 성과에서 빼고 보유분으로 남긴다', () => {
    const { roundTrips, openLots } = matchRoundTrips(
      [trade('buy', '2026-01-01', 10, 100), trade('sell', '2026-02-01', 4, 120)],
      NONE,
    );

    expect(roundTrips).toHaveLength(1);
    expect(roundTrips[0].quantity).toBe(4);
    expect(openLots).toEqual([
      { scope: 'overseas', code: 'AAPL', name: 'Apple', quantity: 6, openedOn: '2026-01-01' },
    ]);
  });

  it('수수료를 매수분·매도분 모두 손익에서 뺀다', () => {
    const { roundTrips } = matchRoundTrips(
      [
        trade('buy', '2026-01-01', 10, 100, { fee: 10 }),
        trade('sell', '2026-02-01', 10, 110, { fee: 12 }),
      ],
      NONE,
    );

    // (110-100)*10 = 100, 수수료 22 차감 → 78
    expect(roundTrips[0].fee).toBe(22);
    expect(roundTrips[0].pnl).toBe(78);
    expect(roundTrips[0].returnPct).toBeCloseTo(7.8, 5);
  });

  it('짝지을 매수가 없는 매도는 버린다', () => {
    // 매수가 수집 범위 밖이면 원가를 알 수 없어 손익을 낼 수 없다.
    const { roundTrips } = matchRoundTrips([trade('sell', '2026-02-01', 10, 110)], NONE);
    expect(roundTrips).toHaveLength(0);
  });

  it('종목이 다르면 서로 섞지 않는다', () => {
    const { roundTrips } = matchRoundTrips(
      [
        trade('buy', '2026-01-01', 10, 100, { code: 'AAPL' }),
        trade('sell', '2026-02-01', 10, 120, { code: 'MSFT', name: 'Microsoft' }),
      ],
      NONE,
    );
    expect(roundTrips).toHaveLength(0);
  });

  it('같은 날 매매는 시각 순서로 짝짓고 보유기간은 0일이다', () => {
    const { roundTrips } = matchRoundTrips(
      [
        trade('sell', '2026-01-01', 10, 120, { tradedTime: '14:00:00' }),
        trade('buy', '2026-01-01', 10, 100, { tradedTime: '09:30:00' }),
      ],
      NONE,
    );
    expect(roundTrips).toHaveLength(1);
    expect(roundTrips[0].holdingDays).toBe(0);
    expect(roundTrips[0].pnl).toBe(200);
  });

  it('시각이 없는 같은 날 매매는 매수를 먼저로 본다', () => {
    // 해외 체결에는 시각이 없다. 체결번호 순으로 두면 매도가 앞서 나와
    // 짝지을 매수가 없는 것처럼 보이는데, 팔려면 먼저 샀어야 한다.
    const sell = trade('sell', '2026-08-07', 10, 120);
    const buy = trade('buy', '2026-08-07', 10, 100);
    expect(sell.dealId < buy.dealId).toBe(true);

    const { roundTrips } = matchRoundTrips([sell, buy], NONE);
    expect(roundTrips).toHaveLength(1);
    expect(roundTrips[0].pnl).toBe(200);
  });

  it('일지를 남긴 종목을 표시한다', () => {
    const { roundTrips } = matchRoundTrips(
      [
        trade('buy', '2026-01-01', 1, 100, { code: 'AAPL' }),
        trade('sell', '2026-02-01', 1, 110, { code: 'AAPL' }),
        trade('buy', '2026-01-01', 1, 100, { code: 'TSLA', name: 'Tesla' }),
        trade('sell', '2026-02-01', 1, 90, { code: 'TSLA', name: 'Tesla' }),
      ],
      new Set(['AAPL']),
    );

    const flags = Object.fromEntries(roundTrips.map((t) => [t.code, t.journaled]));
    expect(flags).toEqual({ AAPL: true, TSLA: false });
  });

  it('최근 청산부터 보여준다', () => {
    const { roundTrips } = matchRoundTrips(
      [
        trade('buy', '2026-01-01', 1, 100),
        trade('sell', '2026-02-01', 1, 110),
        trade('buy', '2026-03-01', 1, 100),
        trade('sell', '2026-04-01', 1, 90),
      ],
      NONE,
    );
    expect(roundTrips.map((t) => t.closedOn)).toEqual(['2026-04-01', '2026-02-01']);
  });

  it('매수/매도로 못 읽은 체결(other)은 무시한다', () => {
    const { roundTrips } = matchRoundTrips(
      [
        trade('buy', '2026-01-01', 10, 100),
        { ...trade('sell', '2026-01-15', 10, 999), side: 'other' as const },
        trade('sell', '2026-02-01', 10, 110),
      ],
      NONE,
    );
    expect(roundTrips).toHaveLength(1);
    expect(roundTrips[0].sellPrice).toBe(110);
  });
});
