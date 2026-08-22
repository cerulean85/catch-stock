/**
 * 파생 지표 — PDF 결론이 말하는 "톱니바퀴". 개별 수치가 아니라 조합이 답을 준다.
 * formula의 대문자는 FRED 시리즈 ID, 소문자는 카탈로그의 지표 id다.
 */
import type { MacroDerived } from './types';

export const MACRO_DERIVED: MacroDerived[] = [
  {
    id: 'net-liquidity',
    label: '순유동성',
    // WALCL·WTREGEN은 백만, RRPONTSYD는 십억 단위로 내려온다. 맞추지 않고 빼면 1000배 어긋난다.
    formula: 'WALCL/1000 - WTREGEN/1000 - RRPONTSYD',
    inputs: ['fed-balance', 'tga', 'rrp'],
    watch:
      '연준이 푼 돈에서, 재무부 계좌와 역레포에 묶여 있어 시장으로 오지 못하는 몫을 뺀 값. ' +
      '위험자산까지 실제로 흘러오는 돈의 크기를 가늠하는 값이라 늘면 위험선호가 커지고 줄면 반대다.',
  },
  {
    id: 'm1-m2-ratio',
    label: 'M1/M2 비율',
    formula: 'M1SL / M2SL',
    inputs: ['m1', 'm2'],
    watch:
      '전체 통화량 중 당장 쓸 수 있는 돈이 차지하는 비율. 떨어지면 돈은 있어도 ' +
      '고금리 예금과 MMF에 묶여 자산시장으로는 오지 않는다는 뜻이다.',
  },
];
