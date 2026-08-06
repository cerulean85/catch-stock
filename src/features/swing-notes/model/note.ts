export const SWING_NOTE_MAX = 2000;

/** 저장 전 정규화: 줄바꿈 통일 + 앞뒤 공백 제거. */
export function normalizeSwingNote(raw: string): string {
  return raw.replace(/\r\n/g, '\n').trim();
}

/** 길이 초과면 에러 메시지, 통과면 null. */
export function validateSwingNote(content: string): string | null {
  return content.length > SWING_NOTE_MAX
    ? `메모는 ${SWING_NOTE_MAX}자 이내로 입력해주세요.`
    : null;
}
