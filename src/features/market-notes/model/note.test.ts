import { describe, expect, it } from 'vitest';
import { NOTE_MAX, normalizeNote, validateNote } from './note';

describe('normalizeNote', () => {
  it('세 칸 모두 줄바꿈을 통일하고 앞뒤 공백을 자른다', () => {
    expect(
      normalizeNote({ preOpen: '  a\r\nb ', intraday: ' c\r\n', postClose: '\n d \n' }),
    ).toEqual({ preOpen: 'a\nb', intraday: 'c', postClose: 'd' });
  });
});

describe('validateNote', () => {
  it('세 칸 다 한도 이내면 통과한다', () => {
    const max = 'a'.repeat(NOTE_MAX);
    expect(validateNote({ preOpen: max, intraday: max, postClose: max })).toBeNull();
  });

  it('한 칸이라도 한도를 넘으면 에러를 준다', () => {
    const over = 'a'.repeat(NOTE_MAX + 1);
    expect(validateNote({ preOpen: '', intraday: over, postClose: '' })).toContain(
      String(NOTE_MAX),
    );
    expect(validateNote({ preOpen: '', intraday: '', postClose: over })).toContain(
      String(NOTE_MAX),
    );
  });
});
