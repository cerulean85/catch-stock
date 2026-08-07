import { describe, expect, it } from 'vitest';
import type { Holding } from '@/features/account';
import { ANALYSIS_INSTRUCTION, buildRiskPrompt, EXTRACT_INSTRUCTION } from './prompt';

const HOLDING: Holding = {
  scope: 'overseas',
  code: 'NVDA',
  name: '엔비디아',
  quantity: 12,
  avgPrice: 180.5,
  currentPrice: 210,
  evalAmount: 2520,
  pnlAmount: 354,
  pnlRate: 16.34,
  currency: 'USD',
  evalAmountKrw: 3_500_000,
};

describe('buildRiskPrompt', () => {
  it('종목·시장·평가 기준을 함께 담는다', () => {
    const prompt = buildRiskPrompt({ holding: HOLDING, criteria: '## 재무\n- 부채비율', today: '2026-08-07' });

    expect(prompt).toContain('오늘 날짜: 2026-08-07');
    expect(prompt).toContain('엔비디아');
    expect(prompt).toContain('NVDA');
    expect(prompt).toContain('미국 등 해외');
    expect(prompt).toContain('## 재무\n- 부채비율');
  });

  it('국내 종목은 시장을 한국으로 적는다', () => {
    const prompt = buildRiskPrompt({
      holding: { ...HOLDING, scope: 'domestic', code: '005930' },
      criteria: '기준',
      today: '2026-08-07',
    });
    expect(prompt).toContain('시장: 한국');
  });

  it('손익률은 부호를 붙여 소수 둘째 자리로 적는다', () => {
    expect(buildRiskPrompt({ holding: HOLDING, criteria: '', today: '2026-08-07' })).toContain(
      '+16.34%',
    );
    expect(
      buildRiskPrompt({ holding: { ...HOLDING, pnlRate: -8.1 }, criteria: '', today: '2026-08-07' }),
    ).toContain('-8.10%');
  });

  it('보유 수량과 평가금액은 넘기지 않는다', () => {
    const prompt = buildRiskPrompt({ holding: HOLDING, criteria: '', today: '2026-08-07' });
    expect(prompt).not.toContain('2520');
    expect(prompt).not.toContain('3500000');
  });

  it('1단계는 검색을 요구하고, 2단계는 판단을 바꾸지 않도록 지시한다', () => {
    expect(ANALYSIS_INSTRUCTION).toContain('google_search');
    // 형식은 2단계가 맡으므로 1단계에 JSON을 요구하면 안 된다 (검색이 꺼지고 JSON도 깨진다).
    expect(ANALYSIS_INSTRUCTION).not.toContain('JSON');
    expect(EXTRACT_INSTRUCTION).toContain('판단을 바꾸지 않는다');
  });
});
