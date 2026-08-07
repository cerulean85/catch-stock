/** KRX 종목코드는 6자리 숫자. 국내 종목은 공개 로고 소스가 없어 모노그램으로 대체한다. */
export function isDomesticCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

/**
 * 로고 CDN에 쓸 심볼. 키움은 'AAPL', 'AAPL.US'처럼 접미사가 붙어 올 수 있어 앞부분만 쓴다.
 * 알파벳으로만 이뤄지지 않으면 로고를 찾을 수 없다고 보고 null.
 */
export function logoSymbol(code: string): string | null {
  const head = code.trim().toUpperCase().split(/[.\s/]/)[0] ?? '';
  return /^[A-Z]{1,6}$/.test(head) ? head : null;
}

/** 해외 종목 로고 URL. 키가 필요 없는 공개 CDN. 국내·비정형 코드는 null. */
export function logoUrl(code: string): string | null {
  if (isDomesticCode(code)) return null;
  const symbol = logoSymbol(code);
  return symbol ? `https://assets.parqet.com/logos/symbol/${symbol}?format=png&size=64` : null;
}

/** 로고가 없을 때 쓸 한 글자. 종목명이 비면 코드에서 가져온다. */
export function monogram(name: string, code: string): string {
  const source = name.trim() || code.trim();
  return source ? source[0].toUpperCase() : '?';
}
