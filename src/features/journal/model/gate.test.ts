import { describe, expect, it } from 'vitest';
import { missingRiskChecks, needsGate } from './gate';
import { RISK_CHECKS } from './types';

describe('missingRiskChecks', () => {
  it('매수 일지를 발행할 때 안 채운 항목을 돌려준다', () => {
    expect(
      missingRiskChecks({
        status: 'published',
        tradeTypes: ['buy'],
        riskChecks: ['entryReason', 'stopLoss'],
      }),
    ).toEqual(['positionSize', 'earningsDate', 'marketDirection', 'invalidation']);
  });

  it('전부 채웠으면 게이트를 띄우지 않는다', () => {
    expect(
      needsGate({ status: 'published', tradeTypes: ['buy'], riskChecks: [...RISK_CHECKS] }),
    ).toBe(false);
  });

  it('매도도 게이트 대상이다', () => {
    expect(needsGate({ status: 'published', tradeTypes: ['sell'], riskChecks: [] })).toBe(true);
  });

  it('초안 저장은 면제한다', () => {
    // 아직 생각 중인 글까지 막으면 기록 자체를 안 하게 된다.
    expect(needsGate({ status: 'draft', tradeTypes: ['buy'], riskChecks: [] })).toBe(false);
  });

  it('실제 진입이 아닌 유형에는 걸지 않는다', () => {
    for (const type of ['analysis', 'plan', 'reflection', 'hold'] as const) {
      expect(needsGate({ status: 'published', tradeTypes: [type], riskChecks: [] })).toBe(false);
    }
  });

  it('여러 유형 중 하나라도 매수·매도면 건다', () => {
    expect(
      needsGate({ status: 'published', tradeTypes: ['analysis', 'buy'], riskChecks: [] }),
    ).toBe(true);
  });

  it('투자 유형을 안 고르면 걸지 않는다', () => {
    expect(needsGate({ status: 'published', tradeTypes: [], riskChecks: [] })).toBe(false);
  });
});
