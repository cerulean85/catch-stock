import 'server-only';
import pLimit from 'p-limit';
import { scoreTicker } from '../model/engine';
import { buildMetrics, type Overlay } from './build-metrics';
import { getUniverse, type UniverseName } from '../model/universe';
import { getPreset } from '../model/presets';
import { defaultEnabled } from '../model/filters';
import * as fred from '@/shared/lib/fred';
import * as cache from '@/shared/lib/cache';
import type { ScoreResult } from '../model/engine';
import type { ScoredItem, ScreenResponse } from '../model/types';

/**
 * 스코어링 서버 레이어 — 단일 종목 스코어 + 유니버스 스크리닝.
 * 캐시·동시성 제어 담당. yahoo 레이트리밋을 고려해 동시성을 낮게 잡는다.
 */

const SCREEN_TTL_HOURS = 12;
const CONCURRENCY = 4; // yahoo 폴백 429 방지 위해 보수적

/** 단일 종목 상세 스코어. 오버레이(수동 정성값) 반영. */
export async function scoreSymbol(
  ticker: string,
  opts: { preset?: string; filters?: Set<string>; overlay?: Overlay } = {},
): Promise<ScoreResult> {
  const metrics = await buildMetrics(ticker, opts.overlay ?? {});
  return scoreTicker(ticker, metrics, opts.preset, opts.filters);
}

function toItem(t: { symbol: string; name: string; sector: string }, r: ScoreResult): ScoredItem {
  return {
    symbol: t.symbol,
    name: t.name,
    sector: t.sector,
    composite: r.composite,
    passedFilter: r.passedFilter,
    headline: r.summary.headline,
    areas: r.areas.map((a) => ({ area: a.area, label: a.label, score: a.score })),
    detail: r,
  };
}

/** 유니버스 스크리닝. 프리셋별로 캐시. */
export async function screenUniverse(
  opts: { preset?: string; universe?: UniverseName; refresh?: boolean } = {},
): Promise<ScreenResponse> {
  const preset = getPreset(opts.preset).key;
  const universe = opts.universe ?? 'default';
  const cacheKey = `scoring:screen:${universe}:${preset}`;

  if (!opts.refresh) {
    const cached = cache.get<ScreenResponse>(cacheKey, SCREEN_TTL_HOURS);
    if (cached) {
      return { ...cached, cache: { hit: true, ttlSeconds: SCREEN_TTL_HOURS * 3600 } };
    }
  }

  const tickers = getUniverse(universe);
  const limit = pLimit(CONCURRENCY);
  const items: ScoredItem[] = [];
  const skipped: { symbol: string; reason: string }[] = [];

  await Promise.all(
    tickers.map((t) =>
      limit(async () => {
        try {
          const r = await scoreSymbol(t.symbol, { preset });
          if (r.composite === null) {
            skipped.push({ symbol: t.symbol, reason: 'no_data' });
            return;
          }
          items.push(toItem(t, r));
        } catch {
          skipped.push({ symbol: t.symbol, reason: 'fetch_failed' });
        }
      }),
    ),
  );

  // 종합점수 내림차순, 필터통과 우선
  items.sort((a, b) => {
    if (a.passedFilter !== b.passedFilter) return a.passedFilter ? -1 : 1;
    return (b.composite ?? 0) - (a.composite ?? 0);
  });

  const macro = await fred.snapshot().catch(() => null);
  const result: ScreenResponse = {
    generatedAt: new Date().toISOString(),
    cache: { hit: false, ttlSeconds: SCREEN_TTL_HOURS * 3600 },
    preset,
    universe,
    filters: [...defaultEnabled()],
    macro,
    items,
    skipped,
  };
  cache.set(cacheKey, result);
  return result;
}
