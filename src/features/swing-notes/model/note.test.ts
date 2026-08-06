import { describe, expect, it } from 'vitest';
import { SWING_NOTE_MAX, normalizeSwingNote, validateSwingNote } from './note';

describe('normalizeSwingNote', () => {
  it('CRLF를 LF로 바꾸고 앞뒤 공백을 자른다', () => {
    expect(normalizeSwingNote('  20일선 눌림\r\n거래량 감소  ')).toBe('20일선 눌림\n거래량 감소');
  });
});

describe('validateSwingNote', () => {
  it('최대 길이까지는 통과한다', () => {
    expect(validateSwingNote('a'.repeat(SWING_NOTE_MAX))).toBeNull();
  });

  it('최대 길이를 넘으면 에러 메시지를 준다', () => {
    expect(validateSwingNote('a'.repeat(SWING_NOTE_MAX + 1))).toContain(String(SWING_NOTE_MAX));
  });
});
