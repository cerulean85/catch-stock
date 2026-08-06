import type { Journal } from './types';
import { effectiveReturn } from './metrics';

export type MistakeKey = 'mistakeNoStopLoss' | 'mistakeNoEntryReason' | 'mistakeLosingTicker';

export interface Mistake {
  key: MistakeKey;
  count: number;
  /** 예: 반복 손실 종목명. 없으면 undefined. */
  detail?: string;
  /** 대표 사례 (최대 3건). */
  samples: { id: string; title: string }[];
}

const sample = (list: Journal[]) => list.slice(0, 3).map((j) => ({ id: j.id, title: j.title }));

/**
 * 발행된 일지에서 반복되는 실수 패턴을 뽑는다.
 * - 손절 미설정인데 손실난 매매
 * - 진입 근거 미기재
 * - 같은 종목에서 2회 이상 손실
 */
export function computeMistakes(journals: Journal[]): Mistake[] {
  const published = journals.filter((j) => j.status === 'published');
  const result: Mistake[] = [];

  const noStopLossLosses = published.filter((j) => {
    const r = effectiveReturn(j);
    return r != null && r < 0 && !j.riskChecks.includes('stopLoss');
  });
  if (noStopLossLosses.length > 0) {
    result.push({
      key: 'mistakeNoStopLoss',
      count: noStopLossLosses.length,
      samples: sample(noStopLossLosses),
    });
  }

  const noEntryReason = published.filter(
    (j) => effectiveReturn(j) != null && !j.riskChecks.includes('entryReason'),
  );
  if (noEntryReason.length > 0) {
    result.push({
      key: 'mistakeNoEntryReason',
      count: noEntryReason.length,
      samples: sample(noEntryReason),
    });
  }

  // 종목별 손실 횟수 집계 → 2회 이상인 종목만.
  const lossByTicker = new Map<string, Journal[]>();
  for (const j of published) {
    const r = effectiveReturn(j);
    if (r == null || r >= 0) continue;
    for (const ticker of j.tickers) {
      const arr = lossByTicker.get(ticker) ?? [];
      arr.push(j);
      lossByTicker.set(ticker, arr);
    }
  }
  for (const [ticker, list] of [...lossByTicker.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    if (list.length < 2) continue;
    result.push({
      key: 'mistakeLosingTicker',
      count: list.length,
      detail: ticker,
      samples: sample(list),
    });
  }

  return result;
}
