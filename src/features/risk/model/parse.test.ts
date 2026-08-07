import { describe, expect, it } from 'vitest';
import { parseAssessment, toRiskLevel } from './parse';

const FULL = JSON.stringify({
  level: 'high',
  summary: '실적은 좋지만 밸류에이션 부담이 큽니다.',
  sections: [
    { title: '거시 경제', level: 'medium', body: '금리 인하 기대가 후퇴했습니다.' },
    { title: '재무', level: 'low', body: '부채비율이 낮습니다.' },
  ],
  watchlist: ['2분기 실적 발표', '대중국 규제'],
});

describe('toRiskLevel', () => {
  it('영문 키를 대소문자 구분 없이 받는다', () => {
    expect(toRiskLevel('high')).toBe('high');
    expect(toRiskLevel('CRITICAL')).toBe('critical');
  });

  it('모델이 한국어로 답해도 읽는다', () => {
    expect(toRiskLevel('낮음')).toBe('low');
    expect(toRiskLevel('매우 높음')).toBe('critical');
  });

  it('모르는 값은 보통으로 떨어뜨린다', () => {
    expect(toRiskLevel('???')).toBe('medium');
    expect(toRiskLevel(undefined)).toBe('medium');
  });
});

describe('parseAssessment', () => {
  it('정상 JSON을 그대로 읽는다', () => {
    const result = parseAssessment(FULL);
    expect(result?.level).toBe('high');
    expect(result?.sections).toHaveLength(2);
    expect(result?.sections[0]).toEqual({
      title: '거시 경제',
      level: 'medium',
      body: '금리 인하 기대가 후퇴했습니다.',
    });
    expect(result?.watchlist).toEqual(['2분기 실적 발표', '대중국 규제']);
  });

  it('코드펜스와 앞뒤 설명이 섞여도 JSON만 잘라낸다', () => {
    const result = parseAssessment('알겠습니다.\n```json\n' + FULL + '\n```\n도움이 되었길!');
    expect(result?.summary).toBe('실적은 좋지만 밸류에이션 부담이 큽니다.');
  });

  it('제목이나 본문이 빈 항목은 버린다', () => {
    const raw = JSON.stringify({
      summary: '요약',
      sections: [
        { title: '', level: 'low', body: '내용' },
        { title: '재무', level: 'low', body: '' },
        { title: '이슈', level: 'low', body: '내용' },
      ],
    });
    expect(parseAssessment(raw)?.sections.map((s) => s.title)).toEqual(['이슈']);
  });

  it('JSON이 아니거나 깨졌으면 실패로 본다', () => {
    expect(parseAssessment('죄송합니다. 답변할 수 없습니다.')).toBeNull();
    expect(parseAssessment('{ "summary": ')).toBeNull();
  });

  it('요약도 항목도 없으면 실패로 본다', () => {
    expect(parseAssessment('{"level":"high"}')).toBeNull();
  });

  it('watchlist가 없거나 배열이 아니어도 견딘다', () => {
    const result = parseAssessment('{"summary":"요약","watchlist":"없음"}');
    expect(result?.watchlist).toEqual([]);
  });
});
