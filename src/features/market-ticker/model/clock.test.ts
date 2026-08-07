import { describe, expect, it } from 'vitest';
import { formatUsMarketTime } from './clock';

describe('formatUsMarketTime', () => {
  it('서머타임 기간에는 UTC-4로 보여준다', () => {
    expect(formatUsMarketTime(new Date('2026-08-07T06:31:05Z'))).toBe('08/07 02:31:05');
  });

  it('서머타임이 끝나면 UTC-5로 보여준다', () => {
    expect(formatUsMarketTime(new Date('2026-12-07T06:31:05Z'))).toBe('12/07 01:31:05');
  });

  it('날짜가 넘어가는 시각도 미국 기준으로 계산한다', () => {
    // 한국 8/7 09:00 = 뉴욕 8/6 20:00
    expect(formatUsMarketTime(new Date('2026-08-07T00:00:00Z'))).toBe('08/06 20:00:00');
  });
});
