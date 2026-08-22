import type { CalendarEntry } from '../model/calendar';
import { MACRO_METRICS } from '../model/metrics';

const LABEL_BY_ID = new Map(MACRO_METRICS.map((metric) => [metric.id, metric.label]));
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/** 화면에 한 번에 보여줄 일정 수. 나머지는 카드의 "다음 발표"로 이어진다. */
const VISIBLE = 10;

function clock(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
}

function dayInZone(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(at);
}

function whenLabel(date: string, daysAway: number): string {
  const weekday = WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()];
  if (daysAway === 0) return `오늘(${weekday})`;
  if (daysAway === 1) return `내일(${weekday})`;
  return `${daysAway}일 뒤(${weekday})`;
}

/** 다가오는 발표 일정. 무엇이 언제 나오고, 그날 어느 카드가 갱신되는지 보여준다. */
export function EconomicCalendar({ entries }: { entries: CalendarEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
        발표 일정을 받지 못했다.
      </p>
    );
  }

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">다가오는 발표</h2>
        <span className="text-xs text-muted-foreground">미 동부 / 한국 시각</span>
      </div>

      <ul className="mt-3 divide-y">
        {entries.slice(0, VISIBLE).map((entry) => {
          const at = new Date(entry.at);
          // 미국 오후 발표는 한국에서 다음 날 새벽이라 날짜가 밀린다.
          const nextDay = dayInZone(at, 'Asia/Seoul') !== dayInZone(at, 'America/New_York');

          return (
            <li key={`${entry.release.releaseId}-${entry.date}`} className="flex gap-3 py-2">
              <div className="w-28 shrink-0">
                <p className="text-xs tabular-nums">
                  {entry.date.slice(5)} {clock(at, 'America/New_York')}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  한국 {clock(at, 'Asia/Seoul')}
                  {nextDay && ' (익일)'}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-sm ${entry.release.major ? 'font-medium' : ''}`}>
                    {entry.release.label}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {whenLabel(entry.date, entry.daysAway)}
                  </span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {entry.release.metrics.map((id) => LABEL_BY_ID.get(id) ?? id).join(', ')}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
