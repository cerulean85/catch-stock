import { describe, expect, it } from 'vitest';
import { isDomesticCode, logoSymbol, logoUrl, monogram } from './logo';

describe('isDomesticCode', () => {
  it('6자리 숫자는 국내 종목', () => {
    expect(isDomesticCode('005930')).toBe(true);
    expect(isDomesticCode(' 000660 ')).toBe(true);
  });

  it('그 외는 국내가 아니다', () => {
    expect(isDomesticCode('AAPL')).toBe(false);
    expect(isDomesticCode('12345')).toBe(false);
  });
});

describe('logoSymbol', () => {
  it('접미사를 떼고 알파벳 심볼만 남긴다', () => {
    expect(logoSymbol('AAPL')).toBe('AAPL');
    expect(logoSymbol('aapl.us')).toBe('AAPL');
    expect(logoSymbol('TSLA ')).toBe('TSLA');
  });

  it('알파벳 심볼이 아니면 null', () => {
    expect(logoSymbol('005930')).toBeNull();
    expect(logoSymbol('BRK.B')).toBe('BRK');
    expect(logoSymbol('')).toBeNull();
    expect(logoSymbol('TOOLONGSYM')).toBeNull();
  });
});

describe('logoUrl', () => {
  it('해외 티커는 CDN URL을 만든다', () => {
    expect(logoUrl('AAPL')).toContain('/logos/symbol/AAPL');
  });

  it('국내 종목은 URL이 없다', () => {
    expect(logoUrl('005930')).toBeNull();
  });
});

describe('monogram', () => {
  it('종목명 첫 글자를 대문자로', () => {
    expect(monogram('삼성전자', '005930')).toBe('삼');
    expect(monogram('apple inc', 'AAPL')).toBe('A');
  });

  it('종목명이 비면 코드에서 가져온다', () => {
    expect(monogram('', 'TSLA')).toBe('T');
    expect(monogram('  ', '')).toBe('?');
  });
});
