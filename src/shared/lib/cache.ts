import 'server-only';

/**
 * 프로세스 전역 인메모리 TTL 캐시.
 *
 * inv-stds 의 SQLite 캐시(`data/cache.py`)를 대체한다. 스코어링은 외부 API(FMP/FRED/yahoo)
 * 콜을 아껴야 하므로, 서버 프로세스 수명 동안 결과를 TTL 로 재사용한다.
 * (screener/api/server.ts 의 globalThis 캐시 패턴과 동일.)
 *
 * 음수(실패) 캐싱: 소진된 FMP 키나 레이트리밋된 yahoo 를 매 요청 재호출하지 않도록
 * `${key}:miss` 를 짧은 TTL 로 저장하는 헬퍼(missRecently/markMiss)를 함께 제공.
 */

interface Entry {
  at: number;
  value: unknown;
}

type GlobalWithCache = typeof globalThis & {
  __scoringCache?: Map<string, Entry>;
};

function store(): Map<string, Entry> {
  const g = globalThis as GlobalWithCache;
  if (!g.__scoringCache) g.__scoringCache = new Map();
  return g.__scoringCache;
}

const HOUR_MS = 60 * 60 * 1000;

/** TTL(시간) 이내면 캐시값, 아니면 null. */
export function get<T = unknown>(key: string, ttlHours: number): T | null {
  const entry = store().get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > ttlHours * HOUR_MS) {
    store().delete(key);
    return null;
  }
  return entry.value as T;
}

export function set(key: string, value: unknown): void {
  store().set(key, { at: Date.now(), value });
}

/** 최근(negTtlHours 이내) 실패로 마킹된 키인지. */
export function missRecently(key: string, negTtlHours = 2): boolean {
  return get(`${key}:miss`, negTtlHours) !== null;
}

/** 실패 마킹(음수 캐시). */
export function markMiss(key: string): void {
  set(`${key}:miss`, 1);
}

/** 캐시 전체 비우기(데모 해제·테스트용). */
export function clear(): void {
  store().clear();
}
