import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Holding, TickerDetail } from '../model/types';

// 리스크 패널의 서버 액션은 next-auth를 끌고 들어와 jsdom에서 뜨지 않는다.
// 리스크 탭 자체는 RiskPanel.test.tsx에서 따로 본다.
vi.mock('@/features/risk', () => ({
  RiskPanel: () => <div data-testid="risk-panel" />,
}));

const { TickerDetailPanel } = await import('./TickerDetailPanel');

const detail: TickerDetail = {
  trades: [
    {
      tradedOn: '2026-08-06',
      tradedTime: '09:15:32',
      dealId: '0001234',
      side: 'buy',
      sideLabel: '현금매수',
      quantity: 10,
      price: 70000,
      amount: 700000,
      fee: null,
      currency: 'KRW',
    },
    {
      tradedOn: '2026-08-07',
      tradedTime: '13:02:11',
      dealId: '0001299',
      side: 'sell',
      sideLabel: '현금매도',
      quantity: 4,
      price: 75000,
      amount: 300000,
      fee: null,
      currency: 'KRW',
    },
  ],
  journals: [
    {
      id: 'j1',
      title: '삼성전자 진입 근거',
      tradedAt: new Date('2026-08-06T01:00:00Z'),
      tradeTypes: ['buy'],
      returnPct: 7.14,
    },
  ],
};

const fetchDetail = vi.fn<(scope: string, code: string) => Promise<TickerDetail>>(
  async () => detail,
);
vi.mock('../api/actions', () => ({
  getTickerDetailAction: (scope: string, code: string) => fetchDetail(scope, code),
}));

const HOLDING: Holding = {
  scope: 'domestic',
  code: '005930',
  name: '삼성전자',
  quantity: 6,
  avgPrice: 70000,
  currentPrice: 75000,
  evalAmount: 450000,
  pnlAmount: 30000,
  pnlRate: 7.14,
  currency: 'KRW',
  evalAmountKrw: null,
};

describe('TickerDetailPanel', () => {
  it('탭은 일지 · 리스크 · 체결 내역 순서로 놓이고 일지가 먼저 열린다', async () => {
    render(<TickerDetailPanel holding={HOLDING} riskCriteria="## 재무" onClose={vi.fn()} />);

    const tabs = screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
    expect(tabs.map((b) => b.textContent)).toEqual(['일지', '리스크', '체결 내역']);
    expect(tabs[0]).toHaveAttribute('aria-pressed', 'true');

    expect(await screen.findByRole('link', { name: /삼성전자 진입 근거/ })).toBeInTheDocument();
    expect(fetchDetail).toHaveBeenCalledWith('domestic', '005930');
  });

  it('체결 내역 탭으로 전환하면 매수·매도가 나온다', async () => {
    const user = userEvent.setup();
    render(<TickerDetailPanel holding={HOLDING} riskCriteria="## 재무" onClose={vi.fn()} />);
    await screen.findByRole('link', { name: /삼성전자 진입 근거/ });

    await user.click(screen.getByRole('button', { name: '체결 내역' }));

    expect(await screen.findByText('매수')).toBeInTheDocument();
    expect(screen.getByText('매도')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /삼성전자 진입 근거/ })).not.toBeInTheDocument();
  });

  it('체결이 없으면 안내 문구를 보여준다', async () => {
    const user = userEvent.setup();
    fetchDetail.mockResolvedValueOnce({ trades: [], journals: [] });
    render(<TickerDetailPanel holding={HOLDING} riskCriteria="## 재무" onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '체결 내역' }));

    expect(await screen.findByText(/체결 내역이 없습니다/)).toBeInTheDocument();
  });

  it('닫기 버튼이 onClose를 호출한다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TickerDetailPanel holding={HOLDING} riskCriteria="## 재무" onClose={onClose} />);
    await screen.findByRole('link', { name: /삼성전자 진입 근거/ });

    await user.click(screen.getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
