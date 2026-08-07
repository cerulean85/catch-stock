import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketTicker } from './MarketTicker';

describe('MarketTicker', () => {
  it('지표를 순서대로 보여준다', () => {
    render(
      <MarketTicker
        quotes={[
          { label: 'WTI', price: 78.55, changePercent: 1.63 },
          { label: 'US 10Y', price: 4.68, changePercent: 0 },
        ]}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('WTI');
    expect(items[0]).toHaveTextContent('78.55');
  });

  it('상승·하락·보합을 기호와 색으로 구분한다', () => {
    render(
      <MarketTicker
        quotes={[
          { label: 'UP', price: 1, changePercent: 1.63 },
          { label: 'DOWN', price: 1, changePercent: -0.18 },
          { label: 'FLAT', price: 1, changePercent: 0 },
        ]}
      />,
    );

    const [up, down, flat] = screen.getAllByRole('listitem');
    // 기호와 숫자 사이에 스크린리더용 텍스트('상승'/'하락')가 들어간다.
    expect(up).toHaveTextContent(/▲상승1\.63%/);
    // 하락은 부호 대신 ▼로 표시하고 숫자는 절댓값을 쓴다.
    expect(down).toHaveTextContent(/▼하락0\.18%/);
    expect(flat).toHaveTextContent(/▲보합0\.00%/);

    expect(up.querySelector('.text-emerald-400')).not.toBeNull();
    expect(down.querySelector('.text-red-400')).not.toBeNull();
    expect(flat.querySelector('.text-neutral-400')).not.toBeNull();
  });

  it('큰 숫자는 자릿수 구분을 넣는다', () => {
    render(<MarketTicker quotes={[{ label: 'NDX', price: 26348.35, changePercent: -0.06 }]} />);
    const [item] = screen.getAllByRole('listitem');
    expect(item).toHaveTextContent('26,348.35');
  });

  it('끊김 없이 흐르도록 목록을 복제하되 복제본은 읽어주지 않는다', () => {
    const { container } = render(
      <MarketTicker quotes={[{ label: 'WTI', price: 78.55, changePercent: 1.63 }]} />,
    );

    const lists = container.querySelectorAll('ul');
    expect(lists).toHaveLength(2);
    expect(lists[1]).toHaveAttribute('aria-hidden', 'true');
    // 복제본은 접근성 트리에서 빠지므로 항목은 한 벌만 잡힌다.
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('시세를 못 받으면 아무것도 그리지 않는다', () => {
    const { container } = render(<MarketTicker quotes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
