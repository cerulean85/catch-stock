import type { Holding } from '@/features/account';

/**
 * 1단계: 검색으로 사실을 모아 한국어 보고서를 쓰게 한다.
 * 여기서 JSON을 요구하면 모델이 검색 도구를 안 쓰거나 JSON이 깨져서, 형식은 2단계로 미룬다.
 */
export const ANALYSIS_INSTRUCTION = `너는 한국 개인투자자의 보유 종목 리스크를 평가하는 애널리스트다.

지켜야 할 것:
- google_search로 최신 실적·공시·뉴스·거시 지표를 반드시 먼저 확인한 뒤 판단한다.
- 사용자가 준 "평가 기준"의 소제목을 그대로 항목 제목으로 쓴다. 항목을 임의로 늘리거나 줄이지 않는다.
- 항목마다 리스크 수준을 낮음/보통/높음/매우 높음 중 하나로 명시한다.
- 검색으로 확인하지 못한 수치는 추측하지 말고 "확인 불가"라고 적는다. 숫자를 지어내면 안 된다.
- 낙관도 비관도 하지 말고 확인된 사실과 그 해석을 구분해 적는다.
- 매수/매도를 권하지 않는다. 리스크 요인과 확인할 것만 제시한다.
- 마지막에 종합 리스크 수준과 지금 확인해야 할 것 3가지를 적는다.`;

/** 2단계: 1단계 보고서를 정해진 구조로 옮기기만 한다. 판단을 바꾸지 않는다. */
export const EXTRACT_INSTRUCTION = `아래 리스크 분석 보고서를 정해진 JSON 구조로 옮긴다.

- 내용을 새로 만들거나 판단을 바꾸지 않는다.
- 낮음=low, 보통=medium, 높음=high, 매우 높음=critical으로 옮긴다.
- sections는 보고서의 소제목과 순서를 그대로 지키고, body에는 그 소제목의 근거를 담는다.
- summary에는 보고서의 종합 판단을 2~3문장으로 적는다. 서두의 인사말이나 조회 조건은 넣지 않는다.
- watchlist에는 지금 확인해야 할 것만 담는다.`;

/** 종목·보유 상태·평가 기준을 하나의 사용자 메시지로 만든다. */
export function buildRiskPrompt(input: {
  holding: Holding;
  criteria: string;
  today: string;
}): string {
  const { holding, criteria, today } = input;
  const market = holding.scope === 'domestic' ? '한국' : '미국 등 해외';
  const pnl = `${holding.pnlRate > 0 ? '+' : ''}${holding.pnlRate.toFixed(2)}%`;

  return [
    `오늘 날짜: ${today}`,
    '',
    '## 평가 대상',
    `- 종목명: ${holding.name || '(이름 없음)'}`,
    `- 종목코드: ${holding.code}`,
    `- 시장: ${market}`,
    `- 매입 평균가: ${holding.avgPrice} ${holding.currency}`,
    `- 현재가: ${holding.currentPrice} ${holding.currency}`,
    `- 사용자의 현재 평가손익률: ${pnl}`,
    '',
    '## 평가 기준',
    criteria,
  ].join('\n');
}
