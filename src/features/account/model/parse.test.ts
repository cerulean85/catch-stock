import { describe, expect, it } from 'vitest';
import {
  apiErrorMessage,
  parseDomesticHoldings,
  parseOverseasHoldings,
  toGroup,
  toNumber,
} from './parse';

describe('toNumber', () => {
  it('부호·0 패딩이 붙은 문자열을 숫자로 바꾼다', () => {
    expect(toNumber('+000000012345')).toBe(12345);
    expect(toNumber('-0000000500')).toBe(-500);
    expect(toNumber('+12.34')).toBeCloseTo(12.34);
  });

  it('빈 값·숫자 아님은 0으로 떨어뜨린다', () => {
    expect(toNumber('')).toBe(0);
    expect(toNumber('  ')).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('abc')).toBe(0);
    expect(toNumber(Number.NaN)).toBe(0);
  });
});

describe('parseDomesticHoldings', () => {
  it('kt00004 응답의 보유 종목을 변환한다', () => {
    const holdings = parseDomesticHoldings({
      stk_acnt_evlt_prst: [
        {
          stk_cd: '005930',
          stk_nm: '삼성전자',
          rmnd_qty: '000000010',
          avg_prc: '000070000',
          cur_prc: '000075000',
          evlt_amt: '000750000',
          pl_amt: '+00050000',
          pl_rt: '+7.14',
        },
      ],
    });

    expect(holdings).toEqual([
      {
        code: '005930',
        name: '삼성전자',
        quantity: 10,
        avgPrice: 70000,
        currentPrice: 75000,
        evalAmount: 750000,
        pnlAmount: 50000,
        pnlRate: 7.14,
        currency: 'KRW',
        evalAmountKrw: null,
      },
    ]);
  });

  it('보유 종목 키가 없으면 빈 배열', () => {
    expect(parseDomesticHoldings({})).toEqual([]);
    expect(parseDomesticHoldings({ stk_acnt_evlt_prst: null })).toEqual([]);
  });
});

describe('parseOverseasHoldings', () => {
  it('ust21070 응답의 보유 종목을 변환한다', () => {
    const holdings = parseOverseasHoldings({
      result_list: [
        {
          stk_cd: 'AAPL',
          frgn_stk_nm: 'APPLE INC',
          crnc_code: 'USD',
          poss_qty: '5',
          frgn_stk_book_uv: '180.25',
          now_pric: '200.10',
          evlt_amt: '1000.50',
          pl_amt: '99.25',
          pl_rt: '+11.01',
          evlt_amt_krw: '1350000.0',
        },
      ],
    });

    expect(holdings[0]).toMatchObject({
      code: 'AAPL',
      name: 'APPLE INC',
      quantity: 5,
      avgPrice: 180.25,
      currency: 'USD',
      evalAmountKrw: 1350000,
    });
  });

  it('종목명이 비면 종목코드로 대체하고, 통화 기본값은 USD', () => {
    const holdings = parseOverseasHoldings({
      result_list: [{ stk_cd: 'TSLA', frgn_stk_nm: '', crnc_code: '' }],
    });
    expect(holdings[0].name).toBe('TSLA');
    expect(holdings[0].currency).toBe('USD');
  });
});

describe('toGroup', () => {
  it('평가금액·손익 합계를 낸다', () => {
    const group = toGroup(
      parseOverseasHoldings({
        result_list: [
          { stk_cd: 'A', evlt_amt: '100', pl_amt: '10', evlt_amt_krw: '130000' },
          { stk_cd: 'B', evlt_amt: '50', pl_amt: '-20', evlt_amt_krw: '65000' },
        ],
      }),
      'USD',
    );

    expect(group.totalEval).toBe(150);
    expect(group.totalPnl).toBe(-10);
    expect(group.totalEvalKrw).toBe(195000);
  });

  it('국내는 원화 환산 합계를 만들지 않는다', () => {
    const group = toGroup(
      parseDomesticHoldings({ stk_acnt_evlt_prst: [{ stk_cd: '005930', evlt_amt: '1000' }] }),
      'KRW',
    );
    expect(group.totalEvalKrw).toBeNull();
    expect(group.currency).toBe('KRW');
  });

  it('보유 종목이 없으면 fallback 통화를 쓴다', () => {
    expect(toGroup([], 'KRW')).toMatchObject({ totalEval: 0, totalPnl: 0, currency: 'KRW' });
  });
});

describe('apiErrorMessage', () => {
  it('return_code가 0이면 정상', () => {
    expect(apiErrorMessage({ return_code: 0, return_msg: '정상적으로 처리되었습니다' })).toBeNull();
    expect(apiErrorMessage({ return_code: '0' })).toBeNull();
    expect(apiErrorMessage({})).toBeNull();
  });

  it('return_code가 0이 아니면 메시지를 돌려준다', () => {
    expect(apiErrorMessage({ return_code: 3, return_msg: '토큰이 유효하지 않습니다' })).toBe(
      '토큰이 유효하지 않습니다',
    );
    expect(apiErrorMessage({ return_code: 3 })).toContain('3');
  });
});
