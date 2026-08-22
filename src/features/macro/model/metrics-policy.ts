/**
 * 중앙은행과 정부의 정책 지표. docs/metrics.pdf 2절.
 * 판정 기준(watch)은 docs/spec/macro-metrics.md에서 정한 것을 옮겼다.
 */
import type { MacroMetric } from './types';

export const POLICY_METRICS: MacroMetric[] = [
  {
    id: 'effr',
    group: 'policy',
    label: '실효 연방기금금리',
    source: 'fred',
    seriesId: 'EFFR',
    transform: 'level',
    frequency: 'D',
    unit: '%',
    watch:
      '은행끼리 하루짜리 돈을 빌릴 때 실제로 적용된 금리. 연준 정책이 시장에 나타난 결과값이다. 이 값 자체보다, 시장이 앞으로 예상하는 금리와 얼마나 벌어져 있는지가 중요하다.',
    linkedTo: ['fedwatch', 'dgs2', 'core-pce'],
  },
  {
    id: 'fedwatch',
    group: 'policy',
    label: '연방기금 선물 내재 금리',
    source: 'yahoo',
    seriesId: 'ZQ=F',
    href: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html',
    transform: 'level',
    frequency: 'D',
    unit: '%',
    watch:
      '연방기금 선물 가격에서 뽑아낸, 시장이 예상하는 앞으로의 정책금리. 뒤로 갈수록 낮아지면 시장은 인하를, 높아지면 동결이나 인상을 보고 있다는 뜻이다. 회의별 인하 확률은 CME 페이지에서 교차 확인한다.',
    linkedTo: ['effr', 'dgs2'],
  },
  {
    id: 'fed-balance',
    group: 'policy',
    label: '연준 총자산',
    source: 'fred',
    seriesId: 'WALCL',
    transform: 'level',
    frequency: 'W',
    unit: '백만 달러',
    watch:
      '연준이 들고 있는 자산의 총액. 줄고 있으면 시중에서 돈을 거둬들이는 중(양적긴축)이고, 감축이 멈추거나 다시 늘면 유동성 국면이 바뀐 것이다. 순유동성 계산의 출발점이다.',
    linkedTo: ['net-liquidity', 'reserves', 'rrp'],
  },
  {
    id: 'reserves',
    group: 'policy',
    label: '지급준비금 잔고',
    source: 'fred',
    seriesId: 'WRESBAL',
    transform: 'level',
    frequency: 'W',
    unit: '백만 달러',
    watch:
      '은행들이 연준에 맡겨 둔 예치금. 3조 달러 근처까지 줄면 결제에 필요한 최소치에 닿아 연준이 긴축을 멈춰야 한다는 압력이 커진다. 역레포가 바닥난 뒤부터 이 값이 줄기 시작한다.',
    linkedTo: ['rrp', 'fed-balance', 'net-liquidity'],
  },
  {
    id: 'tga',
    group: 'policy',
    label: 'TGA(재무부 일반계좌)',
    source: 'fred',
    seriesId: 'WTREGEN',
    transform: 'level',
    frequency: 'W',
    unit: '백만 달러',
    watch:
      '미국 재무부가 연준에 둔 정부 계좌의 잔고. 세금이 들어와 잔고가 차면 그만큼 시중에서 돈이 빠지고, 정부가 지출해 잔고가 줄면 시중에 돈이 풀린다. 부채한도 협상 직후 잔고를 급히 채우는 구간을 조심한다.',
    linkedTo: ['net-liquidity', 'bill-share', 'rrp'],
  },
  {
    id: 'bill-share',
    group: 'policy',
    label: '국채 발행 중 단기채 비중',
    source: 'treasury',
    seriesId: 'v1/accounting/od/auctions_query',
    transform: 'level',
    frequency: 'D',
    unit: '%',
    watch:
      '새로 찍는 국채 중 만기 1년 이하 단기채의 비중. 단기채로 조달하면 MMF와 역레포에 잠겨 있던 돈이 그쪽으로 흡수돼 시장 충격이 적고, 장기채로 조달하면 사줄 곳이 모자라 장기금리가 밀려 올라간다. PDF가 지목한 핵심 톱니다.',
    linkedTo: ['tga', 'rrp', 'dealer-capacity', 'dgs10'],
  },
  {
    id: 'buyback',
    group: 'policy',
    label: '국채 바이백',
    source: 'treasury',
    seriesId: 'v1/accounting/od/buybacks_operations',
    transform: 'level',
    frequency: 'W',
    unit: '달러',
    watch:
      '재무부가 이미 발행한 국채를 도로 사들이는 것. 장기채를 사들이면서 단기채를 새로 찍으면 시장이 떠안은 장기물 부담이 줄어 사실상 돈을 푸는 효과가 난다. 금액과 어느 만기를 샀는지를 같이 본다.',
    linkedTo: ['bill-share', 'dgs10', 'dealer-capacity'],
  },
  {
    id: 'fiscal-balance',
    group: 'policy',
    label: '연방 재정수지',
    source: 'treasury',
    seriesId: 'v1/accounting/mts/mts_table_1',
    transform: 'level',
    frequency: 'M',
    unit: '달러',
    watch:
      '정부가 걷은 돈과 쓴 돈의 차이(회계연도 누적). 적자가 커질수록 국채를 더 찍어야 하고, 세금이 예상보다 잘 걷히면 발행 부담이 줄면서 TGA 잔고가 찬다.',
    linkedTo: ['tga', 'bill-share'],
  },
];
