/**
 * 공개 API가 없어 사람이 확인해 기록하는 지표. 값 대신 확인처(href)를 들고 있다.
 * 판정 기준(watch)은 docs/spec/macro-metrics.md에서 정한 것을 옮겼다.
 */
import type { MacroMetric } from './types';

export const MANUAL_METRICS: MacroMetric[] = [
  {
    id: 'outlook',
    group: 'real-economy',
    label: 'IMF·월드뱅크 경제전망',
    source: 'manual',
    href: 'https://www.imf.org/en/Publications/WEO',
    transform: 'level',
    frequency: 'Q',
    unit: '텍스트',
    watch:
      'IMF·월드뱅크가 보는 세계 경제의 현재 위치. 분기마다 갱신된다. 확장·둔화·침체·회복 중 어디인지에 대한 이들의 판단을 내 판단과 맞춰 보는 용도다.',
    linkedTo: ['gdp'],
  },
  {
    id: 'mmf',
    group: 'liquidity',
    label: 'MMF 잔고',
    source: 'manual',
    href: 'https://www.ici.org/research/stats/mmf',
    transform: 'level',
    frequency: 'W',
    unit: '십억 달러',
    watch:
      '머니마켓펀드에 들어와 대기 중인 자금. ICI가 매주 발표한다. 이 돈이 단기국채로 가는지 위험자산으로 가는지가 자산시장 유동성을 가른다.',
    linkedTo: ['m1', 'rrp', 'bill-share'],
  },
  {
    id: 'ai-exports',
    group: 'trade-fx',
    label: 'AI 밸류체인 수출',
    source: 'manual',
    href: 'https://www.census.gov/foreign-trade/statistics/index.html',
    transform: 'yoy',
    frequency: 'M',
    unit: '%',
    watch:
      '반도체·서버·네트워크 장비처럼 AI에 들어가는 품목의 수출. Census 무역통계에서 품목을 직접 골라야 한다. 급증하면 미국 성장을 끌고 가는 축이 AI 수출로 옮겨간 것이다.',
    linkedTo: ['net-exports', 'power'],
  },
  {
    id: 'geo-risk',
    group: 'geopolitics',
    label: '지정학 리스크',
    source: 'manual',
    href: 'https://www.reuters.com/world/middle-east/',
    transform: 'level',
    frequency: 'D',
    unit: '텍스트',
    watch:
      '중동 분쟁 같은 사건이 유가를 밀어 올려 공급 충격으로 번지는지. 숫자로 재기 어려운 판단이라 시황 메모에 적어 둔다.',
    linkedTo: ['wti', 'brent'],
  },
  {
    id: 'politics',
    group: 'geopolitics',
    label: '행정부 정책·선거 변수',
    source: 'manual',
    href: 'https://home.treasury.gov/news/press-releases',
    transform: 'level',
    frequency: 'D',
    unit: '텍스트',
    watch:
      '선거를 앞둔 물가 대책 압박, 정부 빚 부담 때문에 금리를 낮게 눌러 두려는 시도, 무역 압박 같은 정치 변수. 정책은 지표보다 먼저 움직인다.',
    linkedTo: ['cpi-food', 'trade-balance', 'stablecoin'],
  },
  {
    id: 'stablecoin',
    group: 'geopolitics',
    label: '스테이블코인 단기채 매입',
    source: 'manual',
    href: 'https://www.circle.com/transparency',
    transform: 'level',
    frequency: 'M',
    unit: '십억 달러',
    watch:
      '스테이블코인 발행사가 준비금으로 사들이는 단기국채 규모. 관련 법안(클래리티)이 통과되면 단기국채를 사줄 새 수요처가 생겨 재무부의 발행 부담이 줄어든다.',
    linkedTo: ['bill-share', 'mmf'],
  },
  {
    id: 'power',
    group: 'geopolitics',
    label: '전력 공급·발전 설비',
    source: 'manual',
    href: 'https://www.eia.gov/electricity/',
    transform: 'level',
    frequency: 'M',
    unit: '텍스트',
    watch:
      '데이터센터와 로봇·자율주행이 쓸 전력을 대 줄 발전 설비. 증설 속도가 AI 투자 사이클이 어디까지 갈 수 있는지의 상한을 정한다.',
    linkedTo: ['capex', 'ai-exports'],
  },
];
