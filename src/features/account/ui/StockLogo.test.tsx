import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StockLogo } from './StockLogo';

describe('StockLogo', () => {
  it('해외 티커는 CDN 이미지를 쓴다', () => {
    const { container } = render(<StockLogo code="AAPL" name="APPLE INC" />);

    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toContain('/logos/symbol/AAPL');
  });

  it('국내 종목은 첫 글자 배지로 대체한다', () => {
    const { container } = render(<StockLogo code="005930" name="삼성전자" />);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('삼')).toBeInTheDocument();
  });

  it('이미지 로딩이 실패하면 배지로 떨어진다', () => {
    const { container } = render(<StockLogo code="ZZZZ" name="없는회사" />);

    const img = container.querySelector('img');
    expect(img).not.toBeNull();

    fireEvent.error(img!);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('없')).toBeInTheDocument();
  });
});
