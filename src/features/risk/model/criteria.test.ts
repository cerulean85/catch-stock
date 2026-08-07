import { describe, expect, it } from 'vitest';
import {
  CRITERIA_MAX,
  DEFAULT_RISK_CRITERIA,
  normalizeCriteria,
  validateCriteria,
} from './criteria';

describe('DEFAULT_RISK_CRITERIA', () => {
  it('요청받은 네 관점을 모두 담는다', () => {
    expect(DEFAULT_RISK_CRITERIA).toContain('## 거시 경제');
    expect(DEFAULT_RISK_CRITERIA).toContain('## 기업 펀더멘털');
    expect(DEFAULT_RISK_CRITERIA).toContain('## 재무');
    expect(DEFAULT_RISK_CRITERIA).toContain('## 이슈');
  });

  it('그대로 저장할 수 있는 길이다', () => {
    expect(validateCriteria(DEFAULT_RISK_CRITERIA)).toBeNull();
  });
});

describe('validateCriteria', () => {
  it('빈 값은 막는다', () => {
    expect(validateCriteria('')).not.toBeNull();
  });

  it('상한을 넘으면 막는다', () => {
    expect(validateCriteria('가'.repeat(CRITERIA_MAX + 1))).not.toBeNull();
    expect(validateCriteria('가'.repeat(CRITERIA_MAX))).toBeNull();
  });
});

describe('normalizeCriteria', () => {
  it('앞뒤 공백만 걷어내고 줄바꿈은 지킨다', () => {
    expect(normalizeCriteria('  ## 재무\n- 부채비율  ')).toBe('## 재무\n- 부채비율');
  });
});
