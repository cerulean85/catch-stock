/** 카탈로그의 unit 표기를 화면용 문자열로 바꾼다. 표시 전용이라 계산에는 쓰지 않는다. */

/** 달러 금액은 자릿수에 맞춰 조·억·만으로 줄여 쓴다. 유가처럼 작은 값은 그대로 둔다. */
function money(dollars: number): string {
  const abs = Math.abs(dollars);
  if (abs >= 1e11) return `${(dollars / 1e12).toFixed(2)}조 달러`;
  if (abs >= 1e8) return `${(dollars / 1e8).toFixed(1)}억 달러`;
  if (abs >= 1e4) return `${Math.round(dollars / 1e4).toLocaleString('ko-KR')}만 달러`;
  return `${dollars.toFixed(2)} 달러`;
}

export function formatValue(value: number, unit: string): string {
  switch (unit) {
    case '%':
      return `${value.toFixed(2)}%`;
    case '%p':
      return `${value.toFixed(2)}%p`;
    case '백만 달러':
      return money(value * 1e6);
    case '십억 달러':
      return money(value * 1e9);
    case '달러':
      return money(value);
    case '천 명':
      return `${(value / 10).toFixed(1)}만 명`;
    case '천 호':
      return `${(value / 10).toFixed(1)}만 호`;
    case '호':
      return `${(value / 10000).toFixed(1)}만 호`;
    case '건':
      return `${(value / 10000).toFixed(1)}만 건`;
    case '백만 대':
      return `${(value * 100).toFixed(0)}만 대`;
    case '시간':
      return `${value.toFixed(1)}시간`;
    default:
      return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  }
}

/** 변화량. 부호를 앞에 붙여 방향이 먼저 보이게 한다. */
export function formatChange(change: number, unit: string): string {
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  return `${sign}${formatValue(Math.abs(change), unit)}`;
}

export const FREQUENCY_LABEL: Record<string, string> = {
  D: '일간',
  W: '주간',
  M: '월간',
  Q: '분기',
};
