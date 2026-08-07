import { describe, expect, it } from 'vitest';
import { pickLocalIps } from './ip';

describe('pickLocalIps', () => {
  it('루프백과 IPv6를 걸러내고 IPv4만 남긴다', () => {
    expect(
      pickLocalIps({
        lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
        en0: [
          { address: 'fe80::1', family: 'IPv6', internal: false },
          { address: '192.168.0.10', family: 'IPv4', internal: false },
        ],
      }),
    ).toEqual(['192.168.0.10']);
  });

  it('family를 숫자로 주는 런타임도 지원한다', () => {
    expect(pickLocalIps({ en0: [{ address: '10.0.0.5', family: 4, internal: false }] })).toEqual([
      '10.0.0.5',
    ]);
  });

  it('중복 주소는 한 번만, 인터페이스가 없으면 빈 배열', () => {
    expect(
      pickLocalIps({
        en0: [{ address: '10.0.0.5', family: 'IPv4', internal: false }],
        en1: [{ address: '10.0.0.5', family: 'IPv4', internal: false }],
        en2: undefined,
      }),
    ).toEqual(['10.0.0.5']);
    expect(pickLocalIps({})).toEqual([]);
  });
});
