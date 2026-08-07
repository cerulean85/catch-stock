import type { Holding, HoldingGroup } from './types';

type Raw = Record<string, unknown>;

/**
 * 키움 응답의 숫자는 문자열이고 부호·0 패딩이 붙어 온다('+000000012345', '-0.55', '').
 * 파싱 실패는 0으로 떨어뜨린다 — 잔고 화면에서 NaN을 보여주지 않기 위해서다.
 */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const n = Number(trimmed.replace(/^\+/, ''));
  return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** kt00004(계좌평가현황요청) 응답 → 보유 종목. */
export function parseDomesticHoldings(body: Raw): Holding[] {
  const rows = Array.isArray(body.stk_acnt_evlt_prst) ? (body.stk_acnt_evlt_prst as Raw[]) : [];
  return rows.map((row) => ({
    code: toText(row.stk_cd),
    name: toText(row.stk_nm),
    quantity: toNumber(row.rmnd_qty),
    avgPrice: toNumber(row.avg_prc),
    currentPrice: toNumber(row.cur_prc),
    evalAmount: toNumber(row.evlt_amt),
    pnlAmount: toNumber(row.pl_amt),
    pnlRate: toNumber(row.pl_rt),
    currency: 'KRW',
    evalAmountKrw: null,
  }));
}

/** ust21070(미국주식 잔고확인) 응답 → 보유 종목. */
export function parseOverseasHoldings(body: Raw): Holding[] {
  const rows = Array.isArray(body.result_list) ? (body.result_list as Raw[]) : [];
  return rows.map((row) => ({
    code: toText(row.stk_cd),
    name: toText(row.frgn_stk_nm) || toText(row.stk_cd),
    quantity: toNumber(row.poss_qty),
    avgPrice: toNumber(row.frgn_stk_book_uv),
    currentPrice: toNumber(row.now_pric),
    evalAmount: toNumber(row.evlt_amt),
    pnlAmount: toNumber(row.pl_amt),
    pnlRate: toNumber(row.pl_rt),
    currency: toText(row.crnc_code) || 'USD',
    evalAmountKrw: toNumber(row.evlt_amt_krw),
  }));
}

/** 보유 종목 목록을 합계까지 붙인 그룹으로 만든다. */
export function toGroup(holdings: Holding[], fallbackCurrency: string): HoldingGroup {
  const sum = (pick: (h: Holding) => number) => holdings.reduce((acc, h) => acc + pick(h), 0);
  const hasKrw = holdings.some((h) => h.evalAmountKrw != null);
  return {
    holdings,
    totalEval: sum((h) => h.evalAmount),
    totalPnl: sum((h) => h.pnlAmount),
    totalEvalKrw: hasKrw ? sum((h) => h.evalAmountKrw ?? 0) : null,
    currency: holdings[0]?.currency ?? fallbackCurrency,
  };
}

/** 키움은 정상 응답에도 return_code/return_msg로 실패를 알려준다. 실패면 메시지, 정상이면 null. */
export function apiErrorMessage(body: Raw): string | null {
  const code = body.return_code;
  if (code == null) return null;
  const ok = code === 0 || code === '0';
  return ok ? null : toText(body.return_msg) || `조회 실패 (return_code: ${String(code)})`;
}
