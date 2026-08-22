import 'server-only';

/**
 * 미 재무부 Fiscal Data API. 키가 필요 없다.
 * 필드 이름은 2026-08-23 실호출로 확인했다 — docs/spec/macro-metrics.md 7절.
 */

const BASE = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';

/** 발행·재정 자료는 하루 단위로 갱신된다. */
const REVALIDATE_SECONDS = 60 * 60;

async function get<T>(path: string): Promise<T[]> {
  const response = await fetch(`${BASE}/${path}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!response.ok) throw new Error(`Treasury ${path.split('?')[0]} ${response.status}`);
  const body: { data?: T[] } = await response.json();
  return body.data ?? [];
}

export interface BillShare {
  /** 최근 발행분 중 단기채(Bill)가 차지하는 비중(%). */
  share: number;
  from: string;
  to: string;
}

/**
 * 최근 낙찰분에서 단기채 비중을 낸다. PDF 2번의 "단기채를 새로 발행" 흐름을 보는 자리.
 * 낙찰액(total_accepted)은 최신 건이 비어 있는 경우가 있어 발행 예정액을 쓴다.
 */
export async function fetchBillShare(count = 200): Promise<BillShare> {
  const rows = await get<{ auction_date: string; security_type: string; offering_amt: string }>(
    `v1/accounting/od/auctions_query?page[size]=${count}&sort=-auction_date` +
      '&fields=auction_date,security_type,offering_amt',
  );
  if (rows.length === 0) throw new Error('Treasury 낙찰 자료 없음');

  let bills = 0;
  let total = 0;
  for (const row of rows) {
    const amount = Number.parseFloat(row.offering_amt);
    if (!Number.isFinite(amount)) continue;
    total += amount;
    if (row.security_type === 'Bill') bills += amount;
  }
  if (total === 0) throw new Error('Treasury 발행액 합계가 0');

  const dates = rows.map((row) => row.auction_date).sort();
  return { share: (bills / total) * 100, from: dates[0]!, to: dates[dates.length - 1]! };
}

export interface Buyback {
  date: string;
  /** 낙찰된 액면 총액(달러). */
  accepted: number;
  maturityBucket: string | null;
}

/** 가장 최근 바이백. 날짜 필드가 record_date가 아니라 operation_date다. */
export async function fetchLatestBuyback(): Promise<Buyback> {
  const rows = await get<{
    operation_date: string;
    total_par_amt_accepted: string;
    maturity_bucket: string | null;
  }>('v1/accounting/od/buybacks_operations?page[size]=1&sort=-operation_date');

  const row = rows[0];
  if (!row) throw new Error('Treasury 바이백 자료 없음');
  return {
    date: row.operation_date,
    accepted: Number.parseFloat(row.total_par_amt_accepted),
    maturityBucket: row.maturity_bucket,
  };
}

export interface FiscalYtd {
  date: string;
  /** 회계연도 누적 적자(달러). 양수가 적자다. */
  deficit: number;
}

/**
 * 월간 재정수지표에서 현 회계연도 누적치를 뽑는다. 표에 회계연도별 블록이 쌓여 있어
 * 'Year-to-Date' 행 중 line_code_nbr가 가장 큰 것이 최신 회계연도다.
 */
export async function fetchFiscalYtd(): Promise<FiscalYtd> {
  const rows = await get<{
    record_date: string;
    classification_desc: string;
    current_month_dfct_sur_amt: string;
    line_code_nbr: string;
  }>('v1/accounting/mts/mts_table_1?page[size]=40&sort=-record_date');

  const latest = rows[0]?.record_date;
  const ytd = rows
    .filter((row) => row.record_date === latest && row.classification_desc === 'Year-to-Date')
    .sort((a, b) => Number(b.line_code_nbr) - Number(a.line_code_nbr))[0];

  if (!ytd) throw new Error('Treasury 재정수지 누적 행 없음');
  return { date: ytd.record_date, deficit: Number.parseFloat(ytd.current_month_dfct_sur_amt) };
}
