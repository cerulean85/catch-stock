/** 미국 증시 기준 현지 시간대(동부, 서머타임 자동 반영). */
export const US_MARKET_TIME_ZONE = 'America/New_York';

/** 미국 현지시각을 'MM/DD HH:mm:ss'로 만든다. */
export function formatUsMarketTime(value: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: US_MARKET_TIME_ZONE,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(value)
      .map((part) => [part.type, part.value]),
  );

  return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
