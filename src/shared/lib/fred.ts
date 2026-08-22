import 'server-only';
import pLimit from 'p-limit';

/**
 * FRED(세인트루이스 연준) 관측치 조회. 매크로 대시보드와 스코어링이 같이 쓴다.
 * docs/spec/inv-stds-integration.md에서 공용 클라이언트로 계획된 자리다.
 */

const BASE = 'https://api.stlouisfed.org/fred';

/**
 * FRED는 계열마다 따로 물어봐야 해서 한 화면에 수십 번 부르게 된다.
 * 한꺼번에 쏘면 분당 한도에 걸려 403·429가 떨어지므로 동시 요청을 묶어 둔다.
 */
const limit = pLimit(6);

/** 한도에 걸렸을 때 한 번만 쉬었다 다시 시도한다. */
const RETRY_STATUSES = new Set([403, 429, 503]);

/**
 * 계열마다 갱신 주기가 다르다. 월간 자료를 15분마다 다시 받을 이유가 없고,
 * 그렇게 하면 한 화면에 수십 번씩 부르면서 분당 한도만 잡아먹는다.
 */
export const REVALIDATE_BY_FREQUENCY: Record<string, number> = {
  D: 15 * 60,
  W: 60 * 60,
  M: 6 * 60 * 60,
  Q: 12 * 60 * 60,
};

const DEFAULT_REVALIDATE = 15 * 60;

export interface FredObservation {
  /** YYYY-MM-DD */
  date: string;
  value: number;
}

async function request(url: URL, revalidate: number): Promise<Response> {
  return limit(async () => {
    const first = await fetch(url, { next: { revalidate } });
    if (!RETRY_STATUSES.has(first.status)) return first;
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return fetch(url, { next: { revalidate } });
  });
}

export function hasFredKey(): boolean {
  return Boolean(process.env.FRED_API_KEY);
}

/**
 * 관측치를 **최신이 앞(index 0)** 인 순서로 돌려준다. 계산 함수들이 전부 그 순서를 전제한다.
 * 결측치(".")는 빼고 준다. 실패하면 던지고, 어떤 지표가 왜 비었는지는 호출부가 기록한다.
 */
export async function fetchObservations(
  seriesId: string,
  limit = 40,
  revalidate = DEFAULT_REVALIDATE,
): Promise<FredObservation[]> {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('FRED_API_KEY 미설정');

  const url = new URL(`${BASE}/series/observations`);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', key);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', String(limit));

  const response = await request(url, revalidate);
  if (!response.ok) throw new Error(`FRED ${seriesId} ${response.status}`);

  const body: { observations?: { date: string; value: string }[] } = await response.json();
  return (body.observations ?? []).flatMap((observation) => {
    const value = Number.parseFloat(observation.value);
    return Number.isFinite(value) ? [{ date: observation.date, value }] : [];
  });
}

/**
 * 한 릴리스의 발표 예정일. FRED는 아직 자료가 없는 앞날의 일정도 알려 주므로
 * include_release_dates_with_no_data를 켜야 다가오는 날짜가 나온다.
 */
export async function fetchReleaseDates(
  releaseId: number,
  from: string,
  to: string,
): Promise<string[]> {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('FRED_API_KEY 미설정');

  const url = new URL(`${BASE}/release/dates`);
  url.searchParams.set('release_id', String(releaseId));
  url.searchParams.set('api_key', key);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('realtime_start', from);
  url.searchParams.set('realtime_end', to);
  url.searchParams.set('include_release_dates_with_no_data', 'true');
  url.searchParams.set('sort_order', 'asc');
  url.searchParams.set('limit', '5');

  // 일정은 하루에 한 번 바뀔까 말까 한다.
  const response = await request(url, 6 * 60 * 60);
  if (!response.ok) throw new Error(`FRED release ${releaseId} ${response.status}`);

  const body: { release_dates?: { date: string }[] } = await response.json();
  return (body.release_dates ?? []).map((row) => row.date);
}
