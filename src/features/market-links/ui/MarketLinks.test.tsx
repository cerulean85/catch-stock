import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MARKET_LINKS } from '../model/links';
import { MarketLinks } from './MarketLinks';

describe('MarketLinks', () => {
  it('요청한 링크를 순서대로 모두 보여준다', () => {
    render(<MarketLinks />);

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://www.saveticker.com',
      'https://www.bloomberg.com/',
      'https://www.reuters.com/',
      'https://www.tossinvest.com/?market=us',
      'https://www.youtube.com/@futuresnow',
      'https://www.bloomberg.com/live/us',
    ]);
  });

  it('로고만 두고 이름은 접근성 이름과 툴팁으로 남긴다', () => {
    render(<MarketLinks />);

    const toss = screen.getByRole('link', { name: '토스증권 (US)' });
    expect(toss).toHaveAttribute('title', '토스증권 (US)');
    // 로고 이미지는 링크 이름과 겹치므로 읽어주지 않는다.
    expect(toss.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('외부 사이트는 새 탭에서 안전하게 연다', () => {
    render(<MarketLinks />);

    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
    }
  });

  it('같은 로고를 쓰는 블룸버그 라이브는 표시로 구분한다', () => {
    render(<MarketLinks />);

    const site = screen.getByRole('link', { name: 'Bloomberg' });
    const tv = screen.getByRole('link', { name: 'Bloomberg TV' });

    expect(site.querySelector('img')?.getAttribute('src')).toBe(
      tv.querySelector('img')?.getAttribute('src'),
    );
    expect(site.querySelector('.bg-red-500')).toBeNull();
    expect(tv.querySelector('.bg-red-500')).not.toBeNull();
  });

  it('링크 개수는 목록과 일치한다', () => {
    render(<MarketLinks />);
    expect(screen.getAllByRole('link')).toHaveLength(MARKET_LINKS.length);
  });
});
