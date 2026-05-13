export const DEFAULT_LOCALE = 'ko-KR';
export const DEFAULT_TIME_ZONE = 'Asia/Seoul';

export interface LocaleSettings {
  locale: string;
  timeZone: string;
}

export const LOCALE_OPTIONS = [
  { id: 'ko-KR', label: '한국어', locale: 'ko-KR', timeZone: 'Asia/Seoul' },
  { id: 'en-US', label: 'English', locale: 'en-US', timeZone: 'America/New_York' },
] as const;

export function getLocaleOption(id: string | null | undefined) {
  return LOCALE_OPTIONS.find((option) => option.id === id) ?? LOCALE_OPTIONS[0];
}

export function formatDateTime(
  value: Date | string | number,
  settings: LocaleSettings = { locale: DEFAULT_LOCALE, timeZone: DEFAULT_TIME_ZONE },
): string {
  return new Intl.DateTimeFormat(settings.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: settings.timeZone,
  }).format(new Date(value));
}

export function formatNumber(
  value: number,
  settings: Pick<LocaleSettings, 'locale'> = { locale: DEFAULT_LOCALE },
): string {
  return new Intl.NumberFormat(settings.locale).format(value);
}

export function formatDecimal(
  value: number,
  settings: Pick<LocaleSettings, 'locale'> = { locale: DEFAULT_LOCALE },
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(settings.locale, options).format(value);
}

export function formatCurrency(
  value: number,
  settings: Pick<LocaleSettings, 'locale'> = { locale: DEFAULT_LOCALE },
  currency = 'USD',
): string {
  return new Intl.NumberFormat(settings.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(
  value: number,
  settings: Pick<LocaleSettings, 'locale'> = { locale: DEFAULT_LOCALE },
): string {
  return new Intl.NumberFormat(settings.locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatRelativeTime(
  value: Date | string | number,
  settings: Pick<LocaleSettings, 'locale'> = { locale: DEFAULT_LOCALE },
): string {
  const diffMs = new Date(value).getTime() - Date.now();
  const absMinutes = Math.max(0, Math.floor(Math.abs(diffMs) / 60000));
  const formatter = new Intl.RelativeTimeFormat(settings.locale, { numeric: 'auto' });

  if (absMinutes < 60) {
    return formatter.format(Math.round(diffMs / 60000), 'minute');
  }

  const absHours = Math.floor(absMinutes / 60);
  if (absHours < 24) {
    return formatter.format(Math.round(diffMs / 3_600_000), 'hour');
  }

  return formatter.format(Math.round(diffMs / 86_400_000), 'day');
}

export function formatDateTimeInput(
  value: Date,
  settings: Pick<LocaleSettings, 'timeZone'> = { timeZone: DEFAULT_TIME_ZONE },
): string {
  const dateTimeInputFormat = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: settings.timeZone,
  });
  const parts = Object.fromEntries(
    dateTimeInputFormat.formatToParts(value).map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function parseDateTimeInput(
  value: string,
  settings: Pick<LocaleSettings, 'timeZone'> = { timeZone: DEFAULT_TIME_ZONE },
): Date {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return new Date(Number.NaN);

  const [, year, month, day, hour, minute, second = '00'] = match;
  const utcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  const utcDate = new Date(utcMs);
  const offset = getTimeZoneOffsetMs(utcDate, settings.timeZone);
  return new Date(utcMs - offset);
}

function getTimeZoneOffsetMs(value: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  );

  return localAsUtc - value.getTime();
}
