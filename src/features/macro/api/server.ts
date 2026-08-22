import 'server-only';
import {
  fetchObservations,
  fetchReleaseDates,
  REVALIDATE_BY_FREQUENCY,
  type FredObservation,
} from '@/shared/lib/fred';
import {
  applyTransform,
  contractMonthKey,
  fedFundsSymbols,
  impliedRate,
  netLiquidity,
} from '../model/compute';
import { easternToInstant, MACRO_RELEASES, upcoming, type CalendarEntry } from '../model/calendar';
import { MACRO_DERIVED } from '../model/derived';
import { MACRO_METRICS } from '../model/metrics';
import { readRegime } from '../model/regime';
import type { MacroBoard, MacroDerivedReading, MacroReading } from '../model/board';
import type { MacroMetric } from '../model/types';
import { fetchBillShare, fetchFiscalYtd, fetchLatestBuyback } from './treasury';
import { fetchDealerPositions } from './nyfed';
import { fetchDailyCloses, fetchQuotes } from './yahoo';

/** 스파크라인과 변화 계산에 쓰는 점 개수. */
const HISTORY_POINTS = 24;
/** yoy까지 계산하려면 1년치가 더 필요하다. */
const FETCH_LIMIT = 60;

/** 실패한 지표는 값 대신 이유를 들고 화면에 남는다. */
function failed(metric: MacroMetric, error: unknown): MacroReading {
  return {
    metric,
    value: null,
    change: null,
    asOf: null,
    history: [],
    error: error instanceof Error ? error.message : '조회 실패',
  };
}

/**
 * transform을 매 시점에 적용해 시계열을 만든다. 지수를 그대로 그리면 우상향 직선만
 * 보이므로, 스파크라인도 화면에 찍히는 값과 같은 변환을 거쳐야 한다.
 */
function transformedSeries(metric: MacroMetric, observations: FredObservation[]): number[] {
  const values = observations.map((observation) => observation.value);
  const series: number[] = [];
  for (let offset = HISTORY_POINTS - 1; offset >= 0; offset -= 1) {
    const value = applyTransform(values.slice(offset), metric.transform, metric.frequency);
    if (value != null) series.push(value);
  }
  return series;
}

function seriesReading(metric: MacroMetric, observations: FredObservation[]): MacroReading {
  const history = transformedSeries(metric, observations);
  const value = history[history.length - 1] ?? null;
  const previous = history[history.length - 2];
  return {
    metric,
    value,
    change: value != null && previous != null ? value - previous : null,
    asOf: observations[0]?.date ?? null,
    history,
  };
}

/** 값 없이 확인처만 있는 항목. 실패가 아니라 원래 사람이 채우는 자리다. */
function manualReading(metric: MacroMetric): MacroReading {
  return { metric, value: null, change: null, asOf: null, history: [] };
}

/** 연방기금 선물은 가격이 아니라 내재 금리로 읽는다. 이월물로 정책 경로까지 만든다. */
async function readFedWatch(metric: MacroMetric, today: Date): Promise<MacroReading> {
  const candidates = fedFundsSymbols(today, 5);
  const quotes = await fetchQuotes([metric.seriesId!, ...candidates]);

  const front = quotes.get(metric.seriesId!);
  if (!front) return failed(metric, new Error('연방기금 선물 시세 없음'));

  // ZQ=F는 이미 다음 달 계약일 수 있다. 그보다 뒤인 계약만 이어 붙인다.
  const frontKey = front.underlyingSymbol ? contractMonthKey(front.underlyingSymbol) : null;
  const curve = candidates
    .filter((symbol) => {
      const key = contractMonthKey(symbol);
      return key != null && (frontKey == null || key > frontKey);
    })
    .slice(0, 3)
    .flatMap((symbol) => {
      const quote = quotes.get(symbol);
      return quote ? [impliedRate(quote.price)] : [];
    });

  return {
    metric,
    value: impliedRate(front.price),
    // 선물 가격이 오르면 금리는 내려간다. 부호를 뒤집어야 금리의 변화가 된다.
    change: -front.change,
    asOf: front.asOf ?? null,
    history: [impliedRate(front.price), ...curve],
    note:
      curve.length > 0
        ? `이후 ${curve.map((rate) => `${rate.toFixed(2)}%`).join(' → ')}`
        : undefined,
  };
}

async function readYahoo(metrics: MacroMetric[], today: Date): Promise<MacroReading[]> {
  const plain = metrics.filter((metric) => metric.id !== 'fedwatch');
  const fedwatch = metrics.find((metric) => metric.id === 'fedwatch');

  const [quotes, fedwatchReading] = await Promise.all([
    fetchQuotes(plain.map((metric) => metric.seriesId!)).catch(() => new Map()),
    fedwatch ? readFedWatch(fedwatch, today).catch((error) => failed(fedwatch, error)) : null,
  ]);

  // 차트는 심볼마다 따로 받아야 해서 시세와 나눠 부른다.
  const histories = await Promise.all(
    plain.map((metric) => fetchDailyCloses(metric.seriesId!, HISTORY_POINTS * 2)),
  );

  const readings = plain.map((metric, index) => {
    const closes = (histories[index] ?? []).slice(-HISTORY_POINTS);
    const history = closes.map((row) => row.close);
    const quote = quotes.get(metric.seriesId!);

    if (quote) {
      return {
        metric,
        value: quote.price,
        change: quote.change,
        asOf: quote.asOf ?? null,
        history,
      };
    }

    // 일괄 시세가 간헐적으로 심볼을 빠뜨린다. 차트 종가가 있으면 그걸로 메운다.
    const last = closes[closes.length - 1];
    const previous = closes[closes.length - 2];
    if (!last) return failed(metric, new Error('시세 없음'));
    return {
      metric,
      value: last.close,
      change: previous ? last.close - previous.close : null,
      asOf: last.date,
      history,
    };
  });

  return fedwatchReading ? [...readings, fedwatchReading] : readings;
}

async function readTreasury(metric: MacroMetric): Promise<MacroReading> {
  try {
    if (metric.id === 'bill-share') {
      const { share, from, to } = await fetchBillShare();
      return {
        metric,
        value: share,
        change: null,
        asOf: null,
        history: [],
        note: `${from} ~ ${to} 낙찰분 기준`,
      };
    }
    if (metric.id === 'buyback') {
      const { date, accepted, maturityBucket } = await fetchLatestBuyback();
      return {
        metric,
        value: accepted,
        change: null,
        asOf: date,
        history: [],
        note: maturityBucket ? `만기 ${maturityBucket}` : undefined,
      };
    }
    const { date, deficit } = await fetchFiscalYtd();
    return {
      metric,
      value: deficit,
      change: null,
      asOf: date,
      history: [],
      note: '회계연도 누적',
    };
  } catch (error) {
    return failed(metric, error);
  }
}

async function readNyFed(metric: MacroMetric): Promise<MacroReading> {
  try {
    return seriesReading(metric, await fetchDealerPositions(metric.seriesId!, FETCH_LIMIT));
  } catch (error) {
    return failed(metric, error);
  }
}

/**
 * 2년·3개월 국채는 FRED가 하루 늦게 올린다. 10년 금리는 라이브로 받으므로,
 * 같은 날짜의 공식 스프레드를 빼면 나머지 만기도 같은 날로 맞출 수 있다.
 * 스프레드가 10년과 같은 날짜일 때만 손대고, 아니면 FRED 값을 그대로 둔다.
 */
function alignCurveToLatest(byId: Map<string, MacroReading>): void {
  const ten = byId.get('dgs10');
  if (ten?.value == null || !ten.asOf) return;

  for (const [targetId, spreadId] of [
    ['dgs2', 't10y2y'],
    ['dgs3m', 't10y3m'],
  ] as const) {
    const target = byId.get(targetId);
    const spread = byId.get(spreadId);
    if (!target || spread?.value == null || spread.asOf !== ten.asOf) continue;
    if (target.asOf && target.asOf >= ten.asOf) continue;

    const value = ten.value - spread.value;
    target.change = target.value != null ? value - target.value : null;
    target.value = value;
    target.asOf = ten.asOf;
    target.history = [...target.history, value];
  }
}

/** 원계열(변환 전) 최신값. 파생 계산은 변환된 값이 아니라 원값으로 해야 한다. */
function rawLatest(readings: Map<string, MacroReading>, id: string): number | null {
  const reading = readings.get(id);
  if (!reading) return null;
  // level 변환 지표는 값이 곧 원계열이다. yoy 지표는 파생 계산에 쓰지 않는다.
  return reading.metric.transform === 'level' ? reading.value : null;
}

function buildDerived(
  byId: Map<string, MacroReading>,
  rawSeries: Map<string, number[]>,
): MacroDerivedReading[] {
  return MACRO_DERIVED.map((derived) => {
    if (derived.id === 'net-liquidity') {
      const walcl = rawLatest(byId, 'fed-balance');
      const tga = rawLatest(byId, 'tga');
      const rrp = rawLatest(byId, 'rrp');
      const value = netLiquidity(walcl, tga, rrp);
      return {
        derived,
        value,
        unit: '십억 달러',
        detail:
          value == null
            ? '구성 지표를 못 받았다'
            : `연준 자산 ${Math.round(walcl! / 1000).toLocaleString('ko-KR')} − TGA ${Math.round(tga! / 1000).toLocaleString('ko-KR')} − RRP ${Math.round(rrp!).toLocaleString('ko-KR')} (십억 달러)`,
      };
    }

    const m1 = rawSeries.get('m1')?.[0] ?? null;
    const m2 = rawSeries.get('m2')?.[0] ?? null;
    const value = m1 != null && m2 != null && m2 !== 0 ? m1 / m2 : null;
    return {
      derived,
      value,
      unit: '',
      detail:
        value == null
          ? '구성 지표를 못 받았다'
          : `M1 ${m1!.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} / M2 ${m2!.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} (십억 달러)`,
    };
  });
}

/**
 * 대시보드 한 판. 한 소스가 죽어도 나머지는 그대로 보여준다 —
 * 매크로는 지표 하나가 빠졌다고 화면 전체를 접을 이유가 없다.
 */
export async function getMacroBoard(today = new Date()): Promise<MacroBoard> {
  const bySource = (source: MacroMetric['source']) =>
    MACRO_METRICS.filter((metric) => metric.source === source);

  // 파생 계산은 변환 전 원계열이 필요해 따로 모아둔다.
  const rawSeries = new Map<string, number[]>();
  const fredMetrics = bySource('fred');

  const [fredObservations, yahooReadings, treasuryReadings, dealerReading] = await Promise.all([
    Promise.allSettled(
      fredMetrics.map((metric) =>
        fetchObservations(metric.seriesId!, FETCH_LIMIT, REVALIDATE_BY_FREQUENCY[metric.frequency]),
      ),
    ),
    readYahoo(bySource('yahoo'), today),
    Promise.all(bySource('treasury').map(readTreasury)),
    readNyFed(bySource('nyfed')[0]!),
  ]);

  const fredReadings = fredMetrics.map((metric, index) => {
    const result = fredObservations[index]!;
    if (result.status !== 'fulfilled') return failed(metric, result.reason);
    rawSeries.set(
      metric.id,
      result.value.map((observation) => observation.value),
    );
    return seriesReading(metric, result.value);
  });

  const readings = [
    ...fredReadings,
    ...yahooReadings,
    ...treasuryReadings,
    dealerReading,
    ...bySource('manual').map(manualReading),
  ];

  const byId = new Map(readings.map((reading) => [reading.metric.id, reading]));
  alignCurveToLatest(byId);
  // 카탈로그 순서(=PDF 문서 순서)를 화면 순서로 되돌린다.
  const ordered = MACRO_METRICS.flatMap((metric) => {
    const reading = byId.get(metric.id);
    return reading ? [reading] : [];
  });

  return {
    readings: ordered,
    derived: buildDerived(byId, rawSeries),
    regime: readRegime({
      corePce: rawSeries.get('core-pce') ?? [],
      payrolls: rawSeries.get('payrolls') ?? [],
      unemployment: rawSeries.get('unemployment') ?? [],
    }),
    fetchedAt: today.toISOString(),
  };
}

/**
 * 다가오는 발표 일정. 릴리스마다 따로 물어봐야 해서 병렬로 부르고,
 * 하나가 실패해도 나머지 일정은 그대로 보여준다.
 */
export async function getEconomicCalendar(today = new Date(), limit = MACRO_RELEASES.length) {
  const from = today.toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 70 * 86_400_000).toISOString().slice(0, 10);
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  const results = await Promise.allSettled(
    MACRO_RELEASES.map((release) => fetchReleaseDates(release.releaseId, from, to)),
  );

  const entries: CalendarEntry[] = MACRO_RELEASES.flatMap((release, index) => {
    const result = results[index]!;
    if (result.status !== 'fulfilled') return [];
    // 릴리스마다 가장 가까운 한 건만 쓴다. 같은 발표가 목록을 채우면 안 된다.
    const date = result.value.find((value) => value >= from);
    if (!date) return [];
    const daysAway = Math.round((Date.parse(`${date}T00:00:00Z`) - midnight) / 86_400_000);
    return [{ release, date, daysAway, at: easternToInstant(date, release.etTime).toISOString() }];
  });

  return upcoming(entries, limit);
}
