import { describe, expect, it } from 'vitest';
import type { AccountBalance, Holding } from '@/features/account';
import { summarize } from './summary';

function holding(over: Partial<Holding>): Holding {
  return {
    scope: 'domestic',
    code: '005930',
    name: '삼성전자',
    quantity: 10,
    avgPrice: 70000,
    currentPrice: 70000,
    evalAmount: 700000,
    pnlAmount: 0,
    pnlRate: 0,
    currency: 'KRW',
    evalAmountKrw: null,
    ...over,
  };
}

function balance(domestic: Holding[], overseas: Holding[] = []): AccountBalance {
  const group = (holdings: Holding[], currency: string) =>
    holdings.length === 0
      ? null
      : {
          holdings,
          totalEval: holdings.reduce((s, h) => s + h.evalAmount, 0),
          totalPnl: holdings.reduce((s, h) => s + h.pnlAmount, 0),
          totalEvalKrw: null,
          currency,
        };
  return { domestic: group(domestic, 'KRW'), overseas: group(overseas, 'USD'), sync: null };
}

describe('summarize', () => {
  it('종목별 비중을 평가액 큰 순으로 낸다', () => {
    const summary = summarize(
      balance([
        holding({ code: 'A', name: '가', evalAmount: 300 }),
        holding({ code: 'B', name: '나', evalAmount: 700 }),
      ]),
    );

    expect(summary.totalKrw).toBe(1000);
    expect(summary.weights.map((w) => [w.name, w.weightPct])).toEqual([
      ['나', 70],
      ['가', 30],
    ]);
  });

  it('해외 종목은 원화 환산값으로 합친다', () => {
    const summary = summarize(
      balance(
        [holding({ code: 'A', evalAmount: 500_000 })],
        [
          holding({
            scope: 'overseas',
            code: 'AAPL',
            currency: 'USD',
            evalAmount: 1000,
            evalAmountKrw: 1_500_000,
          }),
        ],
      ),
    );

    // 달러 1000이 아니라 환산된 150만 원으로 합친다.
    expect(summary.totalKrw).toBe(2_000_000);
    expect(summary.byScope).toEqual([
      { label: 'overseas', valueKrw: 1_500_000, weightPct: 75 },
      { label: 'domestic', valueKrw: 500_000, weightPct: 25 },
    ]);
    expect(summary.byCurrency.map((c) => c.label)).toEqual(['USD', 'KRW']);
  });

  it('원화 환산이 없는 해외 종목은 합계에서 빼고 알려준다', () => {
    const summary = summarize(
      balance(
        [holding({ evalAmount: 1000 })],
        [holding({ scope: 'overseas', code: 'AAPL', name: 'Apple', evalAmountKrw: null })],
      ),
    );

    // 환율을 모르는 채 더하면 합계가 틀린다. 조용히 섞지 않는다.
    expect(summary.totalKrw).toBe(1000);
    expect(summary.unconvertible).toEqual(['Apple']);
  });

  it('해외 손익도 같은 환율로 환산해 더한다', () => {
    const summary = summarize(
      balance(
        [],
        [
          holding({
            scope: 'overseas',
            currency: 'USD',
            evalAmount: 1000,
            pnlAmount: 100,
            evalAmountKrw: 1_400_000,
          }),
        ],
      ),
    );
    // 손익 $100은 평가액의 10% → 환산 평가액 140만의 10%
    expect(summary.totalPnlKrw).toBe(140_000);
  });

  it('한 종목이 30% 이상이면 집중 경고를 낸다', () => {
    const summary = summarize(
      balance([
        holding({ code: 'A', name: '몰빵', evalAmount: 400 }),
        holding({ code: 'B', evalAmount: 300 }),
        holding({ code: 'C', evalAmount: 300 }),
      ]),
    );

    const warn = summary.warnings.find((w) => w.key === 'portfolioWarnSingle');
    expect(warn?.detail).toBe('몰빵');
    expect(warn?.value).toBe(40);
  });

  it('고르게 나뉘어 있으면 경고하지 않는다', () => {
    const summary = summarize(
      balance([
        holding({ code: 'A', evalAmount: 100, pnlAmount: 10 }),
        holding({ code: 'B', evalAmount: 100, pnlAmount: 10 }),
        holding({ code: 'C', evalAmount: 100, pnlAmount: 10 }),
        holding({ code: 'D', evalAmount: 100, pnlAmount: 10 }),
        holding({ code: 'E', evalAmount: 100, pnlAmount: 10 }),
      ]),
    );
    expect(summary.warnings).toEqual([]);
  });

  it('상위 3종목이 70% 이상이면 경고한다', () => {
    const summary = summarize(
      balance([
        holding({ code: 'A', evalAmount: 30 }),
        holding({ code: 'B', evalAmount: 25 }),
        holding({ code: 'C', evalAmount: 20 }),
        holding({ code: 'D', evalAmount: 15 }),
        holding({ code: 'E', evalAmount: 10 }),
      ]),
    );
    expect(summary.warnings.map((w) => w.key)).toContain('portfolioWarnTop3');
  });

  it('종목이 적으면 상위 3종목 쏠림으로 보지 않는다', () => {
    // 4종목을 똑같이 나눠도 상위 3종목은 75%다. 이건 쏠림이 아니라 종목 수가 적은 것뿐이다.
    const summary = summarize(
      balance([
        holding({ code: 'A', evalAmount: 25 }),
        holding({ code: 'B', evalAmount: 25 }),
        holding({ code: 'C', evalAmount: 25 }),
        holding({ code: 'D', evalAmount: 25 }),
      ]),
    );
    expect(summary.warnings.map((w) => w.key)).not.toContain('portfolioWarnTop3');
  });

  it('통화가 하나뿐이면 환율 쏠림으로 경고하지 않는다', () => {
    // 원화만 들고 있는 건 '쏠림'이 아니라 그냥 국내 투자자다.
    const summary = summarize(balance([holding({ code: 'A', evalAmount: 100 })]));
    expect(summary.warnings.map((w) => w.key)).not.toContain('portfolioWarnCurrency');
  });

  it('물려 있는 종목 비중이 크면 경고한다', () => {
    const summary = summarize(
      balance([
        holding({ code: 'A', evalAmount: 70, pnlAmount: -10 }),
        holding({ code: 'B', evalAmount: 30, pnlAmount: 5 }),
      ]),
    );
    expect(summary.loserWeightPct).toBe(70);
    expect(summary.winnerWeightPct).toBe(30);
    expect(summary.warnings.map((w) => w.key)).toContain('portfolioWarnLosers');
  });

  it('보유 종목이 없으면 0으로 두고 나누기를 피한다', () => {
    const summary = summarize({ domestic: null, overseas: null, sync: null });
    expect(summary.totalKrw).toBe(0);
    expect(summary.weights).toEqual([]);
    expect(summary.warnings).toEqual([]);
  });
});
