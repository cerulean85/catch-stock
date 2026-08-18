import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildScanPrompt, EXTRACT_INSTRUCTION, GOLDILOCKS_INSTRUCTION } from './criteria';

/**
 * 프롬프트는 GOLDILOCKS.md를 옮겨 적은 것이다. 문서를 고치고 프롬프트를 안 고치면
 * 화면에는 아무 티도 안 나므로, 핵심 수치가 양쪽에 모두 있는지 여기서 잡는다.
 */
const DOC = readFileSync('GOLDILOCKS.md', 'utf8');

describe('GOLDILOCKS_INSTRUCTION', () => {
  it('문서가 지정한 대상 시장을 그대로 쓴다', () => {
    // 문서 첫머리에서 대상 시장을 정한다. 여기가 바뀌면 프롬프트도 따라가야 한다.
    expect(DOC).toContain('S&P500');
    expect(DOC).toContain('나스닥');
    expect(DOC).toContain('뉴욕증권거래소');
    expect(GOLDILOCKS_INSTRUCTION).toContain('S&P500');
    expect(GOLDILOCKS_INSTRUCTION).toContain('나스닥');
    expect(GOLDILOCKS_INSTRUCTION).toContain('뉴욕증권거래소');
    // 한국 시장을 훑으면 안 된다.
    expect(GOLDILOCKS_INSTRUCTION).not.toContain('코스피');
    expect(GOLDILOCKS_INSTRUCTION).not.toContain('코스닥');
  });

  it('문서의 세 축을 모두 담는다', () => {
    expect(GOLDILOCKS_INSTRUCTION).toContain('재료');
    expect(GOLDILOCKS_INSTRUCTION).toContain('차트');
    expect(GOLDILOCKS_INSTRUCTION).toContain('수급');
  });

  it.each([
    ['시가총액 하단', '2,000억'],
    ['시가총액 상단', '1조'],
    ['유보율', '유보율 500%'],
    ['부채비율', '부채비율 100%'],
    ['신용잔고율', '3%'],
    ['이동평균선', '120일'],
    ['보조지표', 'OBV'],
    ['거래량 감소', '50%'],
  ])('문서와 프롬프트가 같은 %s 조건을 쓴다', (_label, value) => {
    expect(DOC).toContain(value);
    expect(GOLDILOCKS_INSTRUCTION).toContain(value);
  });

  it('RSI 중립 구간을 문서와 같게 쓴다', () => {
    expect(DOC).toContain('50~60');
    expect(GOLDILOCKS_INSTRUCTION).toContain('50~60');
    // 과매수·과매도는 후보에서 빼야 한다.
    expect(GOLDILOCKS_INSTRUCTION).toContain('70');
    expect(GOLDILOCKS_INSTRUCTION).toContain('30');
  });

  it('손익비와 손절 폭을 문서와 같게 쓴다', () => {
    expect(GOLDILOCKS_INSTRUCTION).toContain('1:2');
    expect(GOLDILOCKS_INSTRUCTION).toContain('+20~30%');
    expect(GOLDILOCKS_INSTRUCTION).toContain('-5~7%');
  });

  it('검색을 요구하고 숫자를 지어내지 못하게 한다', () => {
    expect(GOLDILOCKS_INSTRUCTION).toContain('google_search');
    expect(GOLDILOCKS_INSTRUCTION).toContain('확인 불가');
    // 형식은 2단계가 맡으므로 1단계에 JSON을 요구하면 검색이 꺼진다.
    expect(GOLDILOCKS_INSTRUCTION).not.toContain('JSON');
  });

  it('2단계는 판단을 바꾸거나 종목을 늘리지 못하게 한다', () => {
    expect(EXTRACT_INSTRUCTION).toContain('판단을 바꾸지 않는다');
    expect(EXTRACT_INSTRUCTION).toContain('없는 종목을 추가하지 않는다');
  });
});

describe('buildScanPrompt', () => {
  it('오늘 날짜와 대상 시장을 함께 넘긴다', () => {
    const prompt = buildScanPrompt('2026-08-07');
    expect(prompt).toContain('2026-08-07');
    expect(prompt).toContain('S&P500');
    expect(prompt).toContain('나스닥');
    expect(prompt).toContain('NYSE');
  });
});
