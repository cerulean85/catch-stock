import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccountBalanceView } from './AccountBalanceView';
import type { AccountBalance, Holding } from '../model/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// 서버 액션은 next-auth를 끌고 들어와 jsdom에서 뜨지 않는다. 정렬 테스트에는 필요 없다.
vi.mock('../api/actions', () => ({
  getTickerDetailAction: vi.fn(async () => ({ trades: [], journals: [] })),
}));

vi.mock('@/features/risk', () => ({
  RiskPanel: () => <div data-testid="risk-panel" />,
}));

function holding(code: string, name: string, evalAmount: number, pnlAmount: number): Holding {
  return {
    scope: 'overseas',
    code,
    name,
    quantity: 1,
    avgPrice: 10,
    currentPrice: 20,
    evalAmount,
    pnlAmount,
    pnlRate: 0,
    currency: 'USD',
    evalAmountKrw: null,
  };
}

const HOLDINGS = [
  holding('AAPL', 'APPLE', 1000, -50),
  holding('MSFT', 'MICROSOFT', 3000, 120),
  holding('TSLA', 'TESLA', 2000, 300),
];

const BALANCE: AccountBalance = {
  domestic: null,
  overseas: {
    holdings: HOLDINGS,
    totalEval: 6000,
    totalPnl: 370,
    totalEvalKrw: null,
    currency: 'USD',
  },
  sync: { status: 'ok', message: null, publicIp: '1.2.3.4', syncedAt: new Date('2026-08-07T00:00:00Z') },
};

function rowCodes(): string[] {
  const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1); // 헤더 제외
  // 첫 칸은 "종목명 + 코드" 구성이고, 코드만 font-mono로 렌더된다.
  return rows.map(
    (row) => within(row).getAllByRole('cell')[0].querySelector('.font-mono')?.textContent ?? '',
  );
}

describe('AccountBalanceView 정렬', () => {
  it('처음에는 수집된 순서를 유지한다', () => {
    render(<AccountBalanceView riskCriteria="## 재무" balance={BALANCE} />);
    expect(rowCodes()).toEqual(['AAPL', 'MSFT', 'TSLA']);
  });

  it('평가금액 헤더를 누르면 큰 값부터, 다시 누르면 작은 값부터', async () => {
    const user = userEvent.setup();
    render(<AccountBalanceView riskCriteria="## 재무" balance={BALANCE} />);

    const header = screen.getByRole('button', { name: /평가금액/ });
    await user.click(header);
    expect(rowCodes()).toEqual(['MSFT', 'TSLA', 'AAPL']);

    await user.click(header);
    expect(rowCodes()).toEqual(['AAPL', 'TSLA', 'MSFT']);
  });

  it('정렬 중인 컬럼을 aria-sort로 알린다', async () => {
    const user = userEvent.setup();
    render(<AccountBalanceView riskCriteria="## 재무" balance={BALANCE} />);

    await user.click(screen.getByRole('button', { name: /손익/ }));

    const header = screen.getByRole('columnheader', { name: /손익/ });
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(rowCodes()).toEqual(['TSLA', 'MSFT', 'AAPL']);
  });

  it('종목 헤더는 이름 오름차순으로 정렬한다', async () => {
    const user = userEvent.setup();
    render(<AccountBalanceView riskCriteria="## 재무" balance={BALANCE} />);

    await user.click(screen.getByRole('button', { name: /종목/ }));
    expect(rowCodes()).toEqual(['AAPL', 'MSFT', 'TSLA']);
  });
});
