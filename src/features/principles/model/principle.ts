export const PRINCIPLE_MAX = 2000;

/** 저장 전 정규화: 줄바꿈 통일 + 앞뒤 공백 제거. */
export function normalizePrinciple(raw: string): string {
  return raw.replace(/\r\n/g, '\n').trim();
}

/** 길이 초과면 에러 메시지, 통과면 null. */
export function validatePrinciple(content: string): string | null {
  return content.length > PRINCIPLE_MAX
    ? `투자 원칙은 ${PRINCIPLE_MAX}자 이내로 입력해주세요.`
    : null;
}
