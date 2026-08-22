import 'server-only';
import type { FredObservation } from '@/shared/lib/fred';

/** 뉴욕 연준 Markets API. 키가 필요 없다. */
const BASE = 'https://markets.newyorkfed.org/api';

/** 프라이머리 딜러 통계는 주간 발표다. */
const REVALIDATE_SECONDS = 6 * 60 * 60;

/**
 * 딜러 국채 순포지션(백만 달러)을 **최신이 앞**인 순서로 돌려준다.
 * 계열 키는 PDPOSGST-TOT — TIPS 제외 미 국채 합계.
 */
export async function fetchDealerPositions(keyId: string, limit = 40): Promise<FredObservation[]> {
  const response = await fetch(`${BASE}/pd/get/${keyId}.json`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) throw new Error(`NY Fed ${keyId} ${response.status}`);

  const body: { pd?: { timeseries?: { asofdate: string; value: string }[] } } =
    await response.json();

  const rows = body.pd?.timeseries ?? [];
  // API는 오래된 것부터 준다. 다른 계열과 순서를 맞춘다.
  return rows
    .slice(-limit)
    .reverse()
    .flatMap((row) => {
      const value = Number.parseFloat(row.value);
      return Number.isFinite(value) ? [{ date: row.asofdate, value }] : [];
    });
}
