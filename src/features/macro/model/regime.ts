/**
 * 경기 국면 판정. PDF 1번의 "확장·둔화·침체·회복 중 어디인가"를
 * 물가 축과 고용 축 두 개로 좁힌 것이다. 기준은 docs/spec/macro-metrics.md 6절.
 *
 * 고용은 신호가 하나가 아니다. 실업률과 고용 증가폭이 정반대를 가리키는 구간이 실제로
 * 자주 나오는데, 둘 중 하나로 단정하면 국면 이름이 실제보다 세게 붙는다.
 * 그래서 엇갈리면 4분면에 억지로 밀어 넣지 않고 판정을 보류한다.
 */
import { movingAverage, sahmGap } from './compute';

export type RegimeId = 'expansion' | 'slowdown' | 'recession' | 'recovery';

export interface Regime {
  id: RegimeId;
  label: string;
  /** 그 국면에서 무엇에 집중해야 하는지. PDF 1번. */
  focus: string;
}

export const REGIMES: Record<RegimeId, Regime> = {
  expansion: { id: 'expansion', label: '확장', focus: '물가와 금리 인상을 본다' },
  slowdown: { id: 'slowdown', label: '둔화', focus: '연준이 물가와 고용 중 무엇을 택하는지 본다' },
  recession: { id: 'recession', label: '침체', focus: '고용과 금리 인하를 본다' },
  recovery: { id: 'recovery', label: '회복', focus: '유동성과 위험선호를 본다' },
};

export function regimeOf(inflationAccelerating: boolean, employmentImproving: boolean): Regime {
  if (inflationAccelerating) return employmentImproving ? REGIMES.expansion : REGIMES.slowdown;
  return employmentImproving ? REGIMES.recovery : REGIMES.recession;
}

/** 한 신호가 가리키는 방향. neutral은 판단을 다른 신호에 넘긴다. */
export type Signal = 'improving' | 'weakening' | 'neutral';

/** 고용 축 종합. mixed는 두 신호가 정반대라 단정하지 않는다는 뜻이다. */
export type EmploymentSignal = Signal | 'mixed';

export interface RegimeInput {
  /** 근원 PCE 지수. 최신이 앞. */
  corePce: number[];
  /** 비농업 고용(천 명). 최신이 앞. */
  payrolls: number[];
  /** 실업률(%). 최신이 앞. */
  unemployment: number[];
}

export interface RegimeReading {
  /** 두 축이 모두 정해졌을 때의 국면. 고용이 엇갈리면 null. */
  regime: Regime | null;
  /** 엇갈릴 때 가능한 국면들. 4분면에서 후보 칸을 함께 표시한다. */
  candidates: RegimeId[];
  summary: string;
  inflationAccelerating: boolean;
  employment: EmploymentSignal;
  /** 판정 근거를 화면에 그대로 보여준다. 숫자 없이 결론만 보이면 못 믿는다. */
  inflationDetail: string;
  employmentDetails: string[];
}

/** 인구 증가를 흡수하는 고용 증가폭(천 명). 이민 유입이 줄며 통념보다 낮아졌다. */
const PAYROLL_FLOOR = 50;
/** 삼 룰 침체 신호 기준(%p). */
const SAHM_TRIGGER = 0.5;
/** 삼 룰 갭이 이보다 작으면 실업률이 아직 바닥 부근이라고 본다. */
const SAHM_FLOOR = 0.1;

/** offset 시점에서 끝나는 3개월 물가 상승률을 연율로 환산한다. */
function annualized3m(index: number[], offset: number): number | null {
  const now = index[offset];
  const then = index[offset + 3];
  if (now == null || then == null || then === 0) return null;
  return ((now / then) ** 4 - 1) * 100;
}

/** 최근 3개월 물가 상승률(연율)이 그 직전 3개월보다 높으면 가속으로 본다. */
function readInflation(corePce: number[]): { accelerating: boolean; detail: string } {
  const recent = annualized3m(corePce, 0);
  const prior = annualized3m(corePce, 3);
  if (recent == null || prior == null) {
    return { accelerating: false, detail: '근원 PCE 자료 부족' };
  }
  const accelerating = recent > prior;
  return {
    accelerating,
    detail:
      `근원 PCE 3개월 연율 ${recent.toFixed(1)}% (직전 3개월 ${prior.toFixed(1)}%) → ` +
      `${accelerating ? '가속' : '둔화'}`,
  };
}

/** 실업률이 바닥 부근이면 개선, 삼 룰에 걸리면 악화. 그 사이는 판단을 넘긴다. */
function readUnemployment(unemployment: number[]): { signal: Signal; detail: string } {
  const gap = sahmGap(unemployment);
  const latest = unemployment[0];
  if (gap == null || latest == null) return { signal: 'neutral', detail: '실업률 자료 부족' };

  if (gap >= SAHM_TRIGGER) {
    return {
      signal: 'weakening',
      detail: `실업률 ${latest.toFixed(1)}%, 최근 1년 저점 대비 +${gap.toFixed(2)}%p → 삼 룰 발동`,
    };
  }
  if (gap <= SAHM_FLOOR) {
    return {
      signal: 'improving',
      detail: `실업률 ${latest.toFixed(1)}%, 최근 1년 저점 수준 → 개선`,
    };
  }
  return {
    signal: 'neutral',
    detail: `실업률 ${latest.toFixed(1)}%, 최근 1년 저점 대비 +${gap.toFixed(2)}%p (삼 룰 기준 +${SAHM_TRIGGER}%p)`,
  };
}

/** 고용 증가폭. 월별 진폭이 커서 3개월과 6개월 평균을 같이 본다. */
function readPayrolls(payrolls: number[]): { signal: Signal; detail: string } {
  const gains = payrolls.slice(0, 7).flatMap((value, index) => {
    const previous = payrolls[index + 1];
    return previous == null ? [] : [value - previous];
  });
  const short = movingAverage(gains, 3);
  const long = movingAverage(gains, 6);
  if (short == null) return { signal: 'neutral', detail: '고용 자료 부족' };

  const signal: Signal =
    short >= PAYROLL_FLOOR ? 'improving' : short <= PAYROLL_FLOOR / 2 ? 'weakening' : 'neutral';
  const longText = long == null ? '' : `, 6개월 ${(long / 10).toFixed(1)}만 명`;

  return {
    signal,
    detail:
      `월평균 고용 증가 3개월 ${(short / 10).toFixed(1)}만 명${longText} ` +
      `(기준 ${PAYROLL_FLOOR / 10}만 명) → ${signal === 'improving' ? '양호' : signal === 'weakening' ? '약함' : '중립'}`,
  };
}

/** 두 신호를 합친다. 정반대면 mixed, 한쪽이 중립이면 나머지를 따른다. */
export function combineSignals(a: Signal, b: Signal): EmploymentSignal {
  if (a === b) return a;
  if (a === 'neutral') return b;
  if (b === 'neutral') return a;
  return 'mixed';
}

/** 두 축을 판정해 국면과 근거를 함께 돌려준다. 자료가 모자라면 null. */
export function readRegime(input: RegimeInput): RegimeReading | null {
  if (input.corePce.length === 0 || input.payrolls.length === 0) return null;

  const inflation = readInflation(input.corePce);
  const unemployment = readUnemployment(input.unemployment);
  const payrolls = readPayrolls(input.payrolls);
  const employment = combineSignals(unemployment.signal, payrolls.signal);

  const details = [unemployment.detail, payrolls.detail];
  const priceLabel = inflation.accelerating ? '물가 가속' : '물가 둔화';

  if (employment === 'mixed' || employment === 'neutral') {
    // 4분면 중 물가 축만 정해진 상태다. 한 칸으로 좁히지 않는다.
    const candidates: RegimeId[] = inflation.accelerating
      ? ['expansion', 'slowdown']
      : ['recovery', 'recession'];
    details.push(employment === 'mixed' ? '→ 신호 엇갈림, 단정 보류' : '→ 신호 중립, 단정 보류');
    return {
      regime: null,
      candidates,
      summary: `엇갈림 (${priceLabel} · 고용 ${employment === 'mixed' ? '혼조' : '중립'})`,
      inflationAccelerating: inflation.accelerating,
      employment,
      inflationDetail: inflation.detail,
      employmentDetails: details,
    };
  }

  const regime = regimeOf(inflation.accelerating, employment === 'improving');
  return {
    regime,
    candidates: [regime.id],
    summary: regime.label,
    inflationAccelerating: inflation.accelerating,
    employment,
    inflationDetail: inflation.detail,
    employmentDetails: details,
  };
}
