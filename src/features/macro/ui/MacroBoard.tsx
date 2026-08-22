import type { MacroBoard as Board } from '../model/board';
import type { CalendarEntry } from '../model/calendar';
import { readFreshness } from '../model/freshness';
import { EconomicCalendar } from './EconomicCalendar';
import { MACRO_GROUPS } from '../model/types';
import { formatValue } from './format';
import { MetricCard } from './MetricCard';
import { RegimeQuadrant } from './RegimeQuadrant';

/**
 * 매크로 대시보드 한 판. 위에서부터 국면 판정 → 파생(톱니바퀴) → 6분류 카드.
 * 분류와 순서는 docs/metrics.pdf 문서 순서를 그대로 따른다.
 */
export function MacroBoard({ board, calendar }: { board: Board; calendar: CalendarEntry[] }) {
  const today = new Date(board.fetchedAt);
  const failures = board.readings.filter((reading) => reading.error).length;
  // 지표별 다음 발표일. 캘린더에서 뽑아 카드로 내려보낸다.
  const nextRelease = new Map<string, string>();
  for (const entry of calendar) {
    for (const id of entry.release.metrics) {
      if (!nextRelease.has(id))
        nextRelease.set(id, `${entry.date.slice(5)} (${entry.daysAway}일 뒤)`);
    }
  }

  const stale = board.readings.filter(
    (reading) =>
      reading.asOf && readFreshness(reading.asOf, reading.metric.frequency, today)?.stale,
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold tracking-tight">매크로 지표</h1>
        <p className="text-xs text-muted-foreground tabular-nums">
          {new Date(board.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 기준
          {` · 지표 ${board.readings.length}개`}
          {stale > 0 && ` · ${stale}개 발표 주기보다 늦음`}
          {failures > 0 && ` · ${failures}개 조회 실패`}
        </p>
      </header>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <RegimeQuadrant reading={board.regime} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {board.derived.map((item) => (
            <div
              key={item.derived.id}
              className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-medium">{item.derived.label}</h2>
                {item.value != null && (
                  <span className="text-lg font-semibold tabular-nums">
                    {formatValue(item.value, item.unit)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">{item.detail}</p>
              <p className="mt-2 border-t pt-2 text-xs leading-relaxed text-muted-foreground">
                {item.derived.watch}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <EconomicCalendar entries={calendar} />
      </div>

      {MACRO_GROUPS.map((group) => {
        const readings = board.readings.filter((reading) => reading.metric.group === group.id);
        if (readings.length === 0) return null;

        return (
          <section key={group.id} className="mt-8">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </h2>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {readings.map((reading) => (
                <MetricCard
                  key={reading.metric.id}
                  reading={reading}
                  today={today}
                  nextRelease={nextRelease.get(reading.metric.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
