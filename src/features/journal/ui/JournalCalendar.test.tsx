import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JournalCalendar } from './JournalCalendar';
import type { Journal } from '../model/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function journal(id: string, title: string, tradedAt: string, tickers: string[] = []): Journal {
  return {
    id,
    userId: 'u1',
    title,
    content: '',
    status: 'published',
    pinned: false,
    tickers,
    tags: [],
    tradeTypes: [],
    riskChecks: [],
    tradeQty: null,
    tradePrice: null,
    sellPrice: null,
    tradeFee: null,
    sentiment: null,
    horizon: null,
    targetReturn: null,
    actualReturn: null,
    linkedJournalId: null,
    reviewAt: null,
    reviewedAt: null,
    tradedAt: new Date(tradedAt),
    createdAt: new Date(tradedAt),
    updatedAt: new Date(tradedAt),
  };
}

describe('JournalCalendar', () => {
  it('일지를 해당 날짜 칸에 링크로 배치한다', () => {
    // 기본 로케일(ko-KR, Asia/Seoul) 기준 8월 5일.
    const items = [journal('j1', '진입 근거', '2026-08-04T16:00:00.000Z', ['AAPL'])];
    render(<JournalCalendar month="2026-08" items={items} />);

    const link = screen.getByRole('link', { name: /진입 근거/ });
    expect(link).toHaveAttribute('href', '/journal/j1');
    expect(link).toHaveTextContent('AAPL · 진입 근거');

    // 4일 칸이 아니라 5일 칸에 들어가야 한다.
    const cell = link.closest('div.min-h-24');
    expect(within(cell as HTMLElement).getByText('5')).toBeInTheDocument();
  });

  it('하루 4건 이상이면 초과분을 +N으로 접는다', () => {
    const items = ['a', 'b', 'c', 'd'].map((id) =>
      journal(id, `기록 ${id}`, '2026-08-10T01:00:00.000Z'),
    );
    render(<JournalCalendar month="2026-08" items={items} />);

    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('해당 달의 모든 날짜 칸을 그린다', () => {
    render(<JournalCalendar month="2026-08" items={[]} />);

    expect(screen.getByText('2026년 8월')).toBeInTheDocument();
    // 8월은 31일까지 + 앞뒤 다른 달 날짜.
    expect(screen.getAllByText('31').length).toBeGreaterThan(0);
  });
});
