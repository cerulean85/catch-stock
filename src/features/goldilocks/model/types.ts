import type { GeminiSource } from '@/shared/lib/gemini';

/** 탐색된 골디락스 후보 1종목. */
export interface GoldilocksCandidate {
  name: string;
  /** 미국 거래소 티커. 확인되지 않으면 빈 문자열. */
  code: string;
  /** 왜 골랐는지 한 문장. 목록에 보이는 줄. */
  summary: string;
  /** 재료 — 턴어라운드·순환매 길목. */
  story: string;
  /** 차트 — 눌림목·이평선 수렴·보조지표. */
  chart: string;
  /** 수급 — 외인·기관 매집, OBV, 신용잔고. */
  supply: string;
  /** 3~6개월 내 촉매와 예상 시점. */
  catalyst: string;
  /** 손절 라인과 손익비. */
  stopLoss: string;
}

export interface GoldilocksScan {
  id: string;
  /** 탐색한 시각. */
  createdAt: Date;
  candidates: GoldilocksCandidate[];
  /** 보고서 총평. */
  note: string;
  sources: GeminiSource[];
  /** 모델이 실제로 웹 검색을 돌렸는지. */
  searched: boolean;
  model: string;
}

export type GoldilocksResult = { data: GoldilocksScan } | { error: string };
