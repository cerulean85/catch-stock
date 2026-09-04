import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Journal } from '../model/types';

const saveJournalReviewAction =
  vi.fn<(id: string, score: number, note: string) => Promise<{ error: string } | null>>();

vi.mock('../api/actions', () => ({
  saveJournalReviewAction: (id: string, score: number, note: string) =>
    saveJournalReviewAction(id, score, note),
}));

const { JournalReviewCard } = await import('./JournalReviewCard');

function journal(over: Partial<Journal> = {}): Journal {
  return {
    id: 'j1',
    userId: 'u1',
    title: '제목',
    content: '',
    status: 'published',
    category: 'trade',
    contentFormat: 'markdown',
    pinned: false,
    tickers: ['AAPL'],
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
    processScore: null,
    reviewNote: null,
    tradedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...over,
  };
}

beforeEach(() => {
  saveJournalReviewAction.mockReset();
  saveJournalReviewAction.mockResolvedValue(null);
});

describe('JournalReviewCard', () => {
  it('결과는 계산해서 보여주고 사용자에게 묻지 않는다', () => {
    render(<JournalReviewCard journal={journal({ actualReturn: '12.5' })} realized={null} />);

    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    // 결과를 고르는 입력은 없다. 과정만 1~5로 받는다.
    expect(screen.getByRole('button', { name: '판단 과정 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '판단 과정 5' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '판단 과정 6' })).not.toBeInTheDocument();
  });

  it('결과가 없으면 없다고 말한다', () => {
    render(<JournalReviewCard journal={journal()} realized={null} />);
    expect(screen.getByText(/아직 결과가 없습니다/)).toBeInTheDocument();
  });

  it('실계좌 실현손익을 함께 보여준다', () => {
    render(
      <JournalReviewCard
        journal={journal({ actualReturn: '10' })}
        realized={{ count: 2, pnl: 300, currency: 'USD', returnPct: 16.7 }}
      />,
    );
    expect(screen.getByText(/\+300 USD/)).toBeInTheDocument();
  });

  it('과정 점수를 고르면 사분면을 즉시 알려준다', async () => {
    render(<JournalReviewCard journal={journal({ actualReturn: '10' })} realized={null} />);

    await userEvent.click(screen.getByRole('button', { name: '판단 과정 2' }));
    // 근거 없이 번 매매 — 가장 위험한 칸이다.
    expect(screen.getByText('운이 좋았음')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '판단 과정 5' }));
    expect(screen.getByText('실력')).toBeInTheDocument();
  });

  it('과정이 좋았는데 잃은 매매는 운이 나빴던 것으로 표시한다', async () => {
    render(<JournalReviewCard journal={journal({ actualReturn: '-7' })} realized={null} />);
    await userEvent.click(screen.getByRole('button', { name: '판단 과정 5' }));
    expect(screen.getByText('운이 나빴음')).toBeInTheDocument();
  });

  it('점수를 고르고 메모를 적어 저장한다', async () => {
    render(<JournalReviewCard journal={journal({ actualReturn: '10' })} realized={null} />);

    await userEvent.click(screen.getByRole('button', { name: '판단 과정 4' }));
    await userEvent.type(screen.getByRole('textbox'), '진입 근거는 맞았다');
    await userEvent.click(screen.getByRole('button', { name: '회고 저장' }));

    await waitFor(() =>
      expect(saveJournalReviewAction).toHaveBeenCalledWith('j1', 4, '진입 근거는 맞았다'),
    );
  });

  it('점수를 안 고르면 저장하지 않는다', async () => {
    render(<JournalReviewCard journal={journal({ actualReturn: '10' })} realized={null} />);

    await userEvent.click(screen.getByRole('button', { name: '회고 저장' }));

    expect(saveJournalReviewAction).not.toHaveBeenCalled();
    expect(screen.getByText('판단 과정 점수를 선택해주세요.')).toBeInTheDocument();
  });

  it('이미 회고한 일지는 매긴 점수와 메모를 그대로 보여준다', () => {
    render(
      <JournalReviewCard
        journal={journal({
          actualReturn: '10',
          processScore: 3,
          reviewNote: '지난번 메모',
          reviewedAt: new Date('2026-02-01T00:00:00Z'),
        })}
        realized={null}
      />,
    );

    expect(screen.getByRole('button', { name: '판단 과정 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('textbox')).toHaveValue('지난번 메모');
    expect(screen.getByRole('button', { name: '회고 수정' })).toBeInTheDocument();
  });
});
