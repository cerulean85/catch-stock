import { describe, expect, it } from 'vitest';
import { PRINCIPLE_MAX, normalizePrinciple, validatePrinciple } from './principle';

describe('normalizePrinciple', () => {
  it('CRLF를 LF로 바꾸고 앞뒤 공백을 자른다', () => {
    expect(normalizePrinciple('  a\r\nb  ')).toBe('a\nb');
  });

  it('빈 입력은 빈 문자열이 된다', () => {
    expect(normalizePrinciple('   \n  ')).toBe('');
  });
});

describe('validatePrinciple', () => {
  it('최대 길이까지는 통과한다', () => {
    expect(validatePrinciple('a'.repeat(PRINCIPLE_MAX))).toBeNull();
  });

  it('최대 길이를 넘으면 에러 메시지를 준다', () => {
    expect(validatePrinciple('a'.repeat(PRINCIPLE_MAX + 1))).toContain(String(PRINCIPLE_MAX));
  });
});
