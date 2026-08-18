import type { JournalSplit, PerformanceStats, RoundTrip } from './types';

const mean = (list: number[]): number | null =>
  list.length === 0 ? null : list.reduce((sum, n) => sum + n, 0) / list.length;

/** 통화가 섞이면 손익을 한 숫자로 더할 수 없어 통화별로 나눠 합친다. */
function pnlByCurrency(trips: RoundTrip[]): { currency: string; pnl: number }[] {
  const sums = new Map<string, number>();
  for (const trip of trips) {
    sums.set(trip.currency, (sums.get(trip.currency) ?? 0) + trip.pnl);
  }
  return [...sums.entries()]
    .map(([currency, pnl]) => ({ currency, pnl }))
    .sort((a, b) => (a.currency < b.currency ? -1 : 1));
}

export function computeStats(trips: RoundTrip[]): PerformanceStats {
  const wins = trips.filter((t) => t.pnl > 0);
  const losses = trips.filter((t) => t.pnl < 0);
  const avgWin = mean(wins.map((t) => t.returnPct));
  const avgLoss = mean(losses.map((t) => t.returnPct));

  return {
    count: trips.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trips.length === 0 ? null : (wins.length / trips.length) * 100,
    // 손실이 한 건도 없으면 나눌 수가 없다. 무한대 대신 null로 두고 화면에서 '—'로 쓴다.
    payoffRatio: avgWin == null || avgLoss == null || avgLoss === 0 ? null : avgWin / -avgLoss,
    avgWin,
    avgLoss,
    avgHoldingDays: mean(trips.map((t) => t.holdingDays)),
    avgReturnPct: mean(trips.map((t) => t.returnPct)),
    pnlByCurrency: pnlByCurrency(trips),
  };
}

export function splitByJournal(trips: RoundTrip[]): JournalSplit {
  return {
    journaled: computeStats(trips.filter((t) => t.journaled)),
    unjournaled: computeStats(trips.filter((t) => !t.journaled)),
  };
}

/** 두 집단의 승률 차이(%p). 한쪽이라도 매매가 없으면 null. */
export function winRateGap(split: JournalSplit): number | null {
  const a = split.journaled.winRate;
  const b = split.unjournaled.winRate;
  if (a == null || b == null) return null;
  return a - b;
}
