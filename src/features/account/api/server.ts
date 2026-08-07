import 'server-only';
import {
  apiErrorMessage,
  parseDomesticHoldings,
  parseOverseasHoldings,
  toGroup,
} from '../model/parse';
import type { AccountBalance, HoldingGroup } from '../model/types';
import { fetchDomesticBalance, fetchOverseasBalance, isConfigured } from './kiwoom';

export { isConfigured };

async function load(
  fetcher: () => Promise<Record<string, unknown>>,
  parse: (body: Record<string, unknown>) => ReturnType<typeof parseDomesticHoldings>,
  currency: string,
): Promise<{ group: HoldingGroup | null; error: string | null }> {
  try {
    const body = await fetcher();
    const message = apiErrorMessage(body);
    if (message) return { group: null, error: message };
    return { group: toGroup(parse(body), currency), error: null };
  } catch (e) {
    return { group: null, error: e instanceof Error ? e.message : '조회 중 오류가 발생했습니다.' };
  }
}

/** 국내·해외 잔고를 함께 조회. 한쪽이 실패해도 다른 쪽은 그대로 반환한다. */
export async function getAccountBalance(): Promise<AccountBalance> {
  const [domestic, overseas] = await Promise.all([
    load(fetchDomesticBalance, parseDomesticHoldings, 'KRW'),
    load(fetchOverseasBalance, parseOverseasHoldings, 'USD'),
  ]);

  const errors: AccountBalance['errors'] = [];
  if (domestic.error) errors.push({ scope: 'domestic', message: domestic.error });
  if (overseas.error) errors.push({ scope: 'overseas', message: overseas.error });

  return {
    domestic: domestic.group,
    overseas: overseas.group,
    errors,
    fetchedAt: new Date(),
  };
}
