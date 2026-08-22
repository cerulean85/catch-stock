/**
 * 시중 유동성과 금융 여건. docs/metrics.pdf 3절.
 * 판정 기준(watch)은 docs/spec/macro-metrics.md에서 정한 것을 옮겼다.
 */
import type { MacroMetric } from './types';

export const LIQUIDITY_METRICS: MacroMetric[] = [
  {
    id: 'm1',
    group: 'liquidity',
    label: 'M1(협의통화)',
    source: 'fred',
    seriesId: 'M1SL',
    transform: 'yoy',
    frequency: 'M',
    unit: '%',
    watch:
      '현금과 수시입출금 예금처럼 당장 쓸 수 있는 돈. 줄어든다는 것은 사람들이 돈을 정기예금이나 MMF처럼 한동안 묶이는 곳으로 옮겼다는 뜻이다.',
    linkedTo: ['m2', 'mmf'],
  },
  {
    id: 'm2',
    group: 'liquidity',
    label: 'M2(광의통화)',
    source: 'fred',
    seriesId: 'M2SL',
    transform: 'yoy',
    frequency: 'M',
    unit: '%',
    watch:
      '정기예금과 MMF까지 포함한 전체 통화량. M1은 줄고 M2만 늘면 돈의 총량은 있는데 자산시장으로는 흘러오지 않는 상태다.',
    linkedTo: ['m1', 'mmf'],
  },
  {
    id: 'rrp',
    group: 'liquidity',
    label: '연준 역레포(RRP) 잔고',
    source: 'fred',
    seriesId: 'RRPONTSYD',
    transform: 'level',
    frequency: 'D',
    unit: '십억 달러',
    watch:
      '갈 곳 없는 하루짜리 돈이 연준에 잠시 맡겨져 있는 잔고. 유동성이 빠질 때 이 완충재가 먼저 마르고, 여기가 바닥나면 그다음부터는 은행 지급준비금이 직접 깎여 나간다.',
    linkedTo: ['net-liquidity', 'reserves', 'bill-share', 'mmf'],
  },
  {
    id: 'dealer-capacity',
    group: 'liquidity',
    label: '프라이머리 딜러 보유 포지션',
    source: 'nyfed',
    seriesId: 'PDPOSGST-TOT',
    transform: 'level',
    frequency: 'W',
    unit: '백만 달러',
    watch:
      '월가 대형 은행(프라이머리 딜러)이 떠안고 있는 국채 물량. 장부가 국채로 가득 차면 시장에 호가를 대주고 레버리지를 일으킬 여력이 줄어든다. 발행이 장기물로 쏠릴 때 같이 본다.',
    linkedTo: ['bill-share', 'buyback', 'hy-oas'],
  },
  {
    id: 'financial-conditions',
    group: 'liquidity',
    label: '금융 여건 지수',
    source: 'fred',
    seriesId: 'NFCI',
    transform: 'level',
    frequency: 'W',
    unit: '지수',
    watch:
      '시카고 연준이 금리·신용·레버리지 100여 개를 합쳐 만든 금융 여건 지수. 0이 평균이고, 플러스로 가면 돈 빌리기가 평균보다 빡빡해진 것이다.',
    linkedTo: ['hy-oas', 'net-liquidity'],
  },
  {
    id: 'financial-stress',
    group: 'liquidity',
    label: '금융 스트레스 지수',
    source: 'fred',
    seriesId: 'STLFSI4',
    transform: 'level',
    frequency: 'W',
    unit: '지수',
    watch:
      '세인트루이스 연준의 금융 스트레스 지수. 0이 평균이며 위로 튀면 시장이 사고를 소화하지 못하고 있다는 뜻이라, 위험자산에서 먼저 반응한다.',
    linkedTo: ['financial-conditions', 'hy-oas'],
  },
];
