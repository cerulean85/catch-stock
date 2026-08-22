import { describe, expect, it } from 'vitest';
import { easternToInstant, MACRO_RELEASES, upcoming, type CalendarEntry } from './calendar';

function entry(date: string, daysAway: number, major = false): CalendarEntry {
  const release = {
    releaseId: daysAway,
    label: date,
    etTime: [8, 30] as [number, number],
    metrics: [],
    major,
  };
  return { release, date, daysAway, at: easternToInstant(date, [8, 30]).toISOString() };
}

describe('easternToInstant', () => {
  it('서머타임 기간에는 미 동부가 UTC-4다', () => {
    // 8/26 08:30 ET = 12:30 UTC = 한국 21:30
    expect(easternToInstant('2026-08-26', [8, 30]).toISOString()).toBe('2026-08-26T12:30:00.000Z');
  });

  it('겨울에는 UTC-5라 한 시간 밀린다', () => {
    expect(easternToInstant('2026-12-10', [8, 30]).toISOString()).toBe('2026-12-10T13:30:00.000Z');
  });

  it('오후 발표는 한국에서 다음 날이 된다', () => {
    const at = easternToInstant('2026-08-26', [16, 0]);
    const seoul = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(at);
    expect(seoul).toBe('2026-08-27');
  });
});

describe('upcoming', () => {
  it('지난 일정은 빼고 날짜순으로 준다', () => {
    const sorted = upcoming(
      [entry('2026-09-01', 9), entry('2026-08-20', -3), entry('2026-08-26', 3)],
      10,
    );
    expect(sorted.map((item) => item.date)).toEqual(['2026-08-26', '2026-09-01']);
  });

  it('같은 날이면 큰 발표를 먼저 놓는다', () => {
    const sorted = upcoming([entry('2026-08-26', 3), entry('2026-08-26', 3, true)], 10);
    expect(sorted[0]?.release.major).toBe(true);
  });
});

describe('MACRO_RELEASES', () => {
  it('릴리스마다 발표 시각이 정해져 있다', () => {
    for (const release of MACRO_RELEASES) {
      expect(release.etTime[0], release.label).toBeGreaterThanOrEqual(0);
      expect(release.etTime[0], release.label).toBeLessThan(24);
    }
  });

  it('releaseId가 겹치지 않는다', () => {
    const ids = MACRO_RELEASES.map((release) => release.releaseId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
