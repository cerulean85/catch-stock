export const NOTE_MAX = 1000;

/** 화면에 보이는 순서 그대로. */
export const NOTE_FIELDS = ['preOpen', 'intraday', 'postClose'] as const;
export type NoteField = (typeof NOTE_FIELDS)[number];

export type MarketNote = Record<NoteField, string>;

export const EMPTY_NOTE: MarketNote = { preOpen: '', intraday: '', postClose: '' };

/** 저장 전 정규화: 줄바꿈 통일 + 앞뒤 공백 제거. */
export function normalizeNote(raw: MarketNote): MarketNote {
  const clean = (s: string) => s.replace(/\r\n/g, '\n').trim();
  return {
    preOpen: clean(raw.preOpen),
    intraday: clean(raw.intraday),
    postClose: clean(raw.postClose),
  };
}

/** 어느 칸이든 길이를 넘으면 에러 메시지, 통과면 null. */
export function validateNote(note: MarketNote): string | null {
  const tooLong = NOTE_FIELDS.some((field) => note[field].length > NOTE_MAX);
  return tooLong ? `메모는 각각 ${NOTE_MAX}자 이내로 입력해주세요.` : null;
}
