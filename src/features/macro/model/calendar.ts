/**
 * 경제 캘린더. FRED는 통계별 발표 일정을 릴리스 단위로 미리 공개한다.
 * 여기 적은 릴리스만 골라 다가오는 일정을 보여준다 — 전체를 다 받으면 잡음이 너무 많다.
 * releaseId는 2026-08-23에 fred/series/release로 확인했다.
 */

export interface MacroRelease {
  releaseId: number;
  label: string;
  /** 미 동부 시간 기준 발표 시각. FRED는 날짜만 주므로 기관별 관례를 적어 둔다. */
  etTime: [hour: number, minute: number];
  /** 이 발표로 값이 갱신되는 카탈로그 지표. 화면에서 무엇이 바뀌는지 알려 준다. */
  metrics: string[];
  /** 시장이 특히 크게 반응하는 발표. 목록에서 먼저 눈에 띄게 한다. */
  major?: boolean;
}

export const MACRO_RELEASES: MacroRelease[] = [
  {
    releaseId: 50,
    etTime: [8, 30],
    label: '고용상황',
    metrics: ['payrolls', 'unemployment', 'u6', 'participation', 'work-hours', 'wages'],
    major: true,
  },
  {
    releaseId: 10,
    etTime: [8, 30],
    label: '소비자물가(CPI)',
    metrics: ['cpi', 'core-cpi', 'cpi-food', 'shelter-cpi'],
    major: true,
  },
  {
    releaseId: 54,
    etTime: [8, 30],
    label: '개인소득·지출(PCE)',
    metrics: ['core-pce', 'real-consumption', 'real-income', 'savings-rate'],
    major: true,
  },
  {
    releaseId: 53,
    etTime: [8, 30],
    label: '국내총생산(GDP)',
    metrics: ['gdp', 'net-exports'],
    major: true,
  },
  { releaseId: 46, etTime: [8, 30], label: '생산자물가(PPI)', metrics: ['ppi'] },
  {
    releaseId: 180,
    etTime: [8, 30],
    label: '주간 실업수당 청구',
    metrics: ['claims', 'continued-claims'],
  },
  { releaseId: 9, etTime: [8, 30], label: '소매판매', metrics: ['retail-sales'] },
  { releaseId: 13, etTime: [9, 15], label: '산업생산·설비가동률', metrics: ['indpro', 'tcu'] },
  {
    releaseId: 192,
    etTime: [10, 0],
    label: '구인·이직(JOLTS)',
    metrics: ['job-openings', 'quits', 'layoffs'],
  },
  { releaseId: 95, etTime: [8, 30], label: '내구재 주문', metrics: ['durable-orders', 'capex'] },
  { releaseId: 27, etTime: [8, 30], label: '주택 착공·허가', metrics: ['houst', 'permit'] },
  { releaseId: 97, etTime: [10, 0], label: '신규 주택 판매', metrics: ['new-home-sales'] },
  { releaseId: 291, etTime: [10, 0], label: '기존 주택 판매', metrics: ['existing-home-sales'] },
  { releaseId: 199, etTime: [9, 0], label: '주택가격(케이스-실러)', metrics: ['home-prices'] },
  {
    releaseId: 91,
    etTime: [10, 0],
    label: '미시간대 소비자 서베이',
    metrics: ['sentiment', 'inflation-expect-1y'],
  },
  { releaseId: 93, etTime: [16, 0], label: '자동차 판매', metrics: ['vehicle-sales'] },
  { releaseId: 229, etTime: [10, 0], label: '건설지출', metrics: ['construction'] },
];

export interface CalendarEntry {
  release: MacroRelease;
  /** YYYY-MM-DD (미 동부 기준 발표일) */
  date: string;
  /** 오늘로부터 며칠 뒤인지. 0이면 오늘. */
  daysAway: number;
  /** 발표 시점의 절대 시각(ISO). 미국·한국 시각을 여기서 각각 만든다. */
  at: string;
}

/** 어떤 시점에 그 지역이 UTC보다 몇 분 앞서는지. 서머타임이 있어 날짜마다 다르다. */
function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return (asUtc - at.getTime()) / 60_000;
}

/**
 * 미 동부 벽시계 시각을 절대 시각으로 옮긴다. 3월~11월은 UTC-4, 나머지는 UTC-5라
 * 고정 오프셋을 쓰면 겨울 일정이 한 시간씩 밀린다.
 */
export function easternToInstant(date: string, [hour, minute]: [number, number]): Date {
  const [year, month, day] = date.split('-').map(Number);
  const guess = Date.UTC(year!, month! - 1, day!, hour, minute);
  const offset = zoneOffsetMinutes('America/New_York', new Date(guess));
  return new Date(guess - offset * 60_000);
}

/** 오늘 이후 일정만 남기고 날짜순으로 정렬한다. 같은 날이면 큰 발표를 먼저 놓는다. */
export function upcoming(entries: CalendarEntry[], limit: number): CalendarEntry[] {
  return entries
    .filter((entry) => entry.daysAway >= 0)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return Number(Boolean(b.release.major)) - Number(Boolean(a.release.major));
    })
    .slice(0, limit);
}
