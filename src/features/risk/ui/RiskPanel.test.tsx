import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Holding } from '@/features/account';
import type { RiskAssessment, RiskResult } from '../model/types';

const evaluateRiskAction = vi.fn<(scope: string, code: string) => Promise<RiskResult>>();
const saveRiskCriteriaAction = vi.fn<(content: string) => Promise<{ error: string } | null>>();
const listRiskAssessmentsAction =
  vi.fn<(scope: string, code: string) => Promise<RiskAssessment[]>>();

vi.mock('../api/actions', () => ({
  evaluateRiskAction: (scope: string, code: string) => evaluateRiskAction(scope, code),
  saveRiskCriteriaAction: (content: string) => saveRiskCriteriaAction(content),
  listRiskAssessmentsAction: (scope: string, code: string) =>
    listRiskAssessmentsAction(scope, code),
}));

const { RiskPanel } = await import('./RiskPanel');

const HOLDING: Holding = {
  scope: 'overseas',
  code: 'NVDA',
  name: '엔비디아',
  quantity: 12,
  avgPrice: 180,
  currentPrice: 210,
  evalAmount: 2520,
  pnlAmount: 360,
  pnlRate: 16.67,
  currency: 'USD',
  evalAmountKrw: null,
};

const ASSESSMENT: RiskAssessment = {
  id: 'a1',
  createdAt: new Date('2026-08-07T05:30:00Z'),
  level: 'high',
  summary: '밸류에이션 부담이 큽니다.',
  sections: [{ title: '거시 경제', level: 'medium', body: '금리 인하 기대가 후퇴했습니다.' }],
  watchlist: ['2분기 실적 발표'],
  sources: [{ title: 'reuters.com', uri: 'https://example.com/a' }],
  searched: true,
  model: 'gemini-3.6-flash',
};

const OLDER: RiskAssessment = {
  ...ASSESSMENT,
  id: 'a0',
  createdAt: new Date('2026-08-01T01:00:00Z'),
  level: 'low',
  summary: '한 주 전에는 부담이 덜했습니다.',
};

beforeEach(() => {
  evaluateRiskAction.mockReset();
  saveRiskCriteriaAction.mockReset();
  listRiskAssessmentsAction.mockReset();
  listRiskAssessmentsAction.mockResolvedValue([]);
});

describe('RiskPanel', () => {
  it('이력이 없으면 평가하지 않고 안내만 보여준다', async () => {
    render(<RiskPanel holding={HOLDING} criteria="## 재무" />);

    await waitFor(() => expect(listRiskAssessmentsAction).toHaveBeenCalledWith('overseas', 'NVDA'));
    expect(evaluateRiskAction).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /리스크 평가/ })).toBeInTheDocument();
  });

  it('저장된 평가가 있으면 다시 부르지 않고 최신 것을 보여준다', async () => {
    listRiskAssessmentsAction.mockResolvedValue([ASSESSMENT, OLDER]);
    render(<RiskPanel holding={HOLDING} criteria="## 재무" />);

    await waitFor(() => expect(screen.getByText('밸류에이션 부담이 큽니다.')).toBeInTheDocument());
    expect(evaluateRiskAction).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /다시 평가/ })).toBeInTheDocument();
  });

  it('평가 시각을 함께 보여준다', async () => {
    listRiskAssessmentsAction.mockResolvedValue([ASSESSMENT]);
    render(<RiskPanel holding={HOLDING} criteria="## 재무" />);

    // 2026-08-07T05:30Z = 한국시간 오후 2:30
    await waitFor(() => expect(screen.getByText(/평가 시각/)).toBeInTheDocument());
    expect(screen.getByText(/2026\. 8\. 7\..*오후 2:30/)).toBeInTheDocument();
  });

  it('과거 평가를 골라 그 시점 내용을 다시 본다', async () => {
    listRiskAssessmentsAction.mockResolvedValue([ASSESSMENT, OLDER]);
    render(<RiskPanel holding={HOLDING} criteria="## 재무" />);

    await waitFor(() => expect(screen.getByText('과거 평가 내역')).toBeInTheDocument());
    const entries = screen.getAllByRole('button', { pressed: false });
    await userEvent.click(entries[entries.length - 1]);

    await waitFor(() =>
      expect(screen.getByText('한 주 전에는 부담이 덜했습니다.')).toBeInTheDocument(),
    );
    expect(screen.queryByText('밸류에이션 부담이 큽니다.')).not.toBeInTheDocument();
  });

  it('이력이 하나뿐이면 목록을 띄우지 않는다', async () => {
    listRiskAssessmentsAction.mockResolvedValue([ASSESSMENT]);
    render(<RiskPanel holding={HOLDING} criteria="## 재무" />);

    await waitFor(() => expect(screen.getByText('밸류에이션 부담이 큽니다.')).toBeInTheDocument());
    expect(screen.queryByText('과거 평가 내역')).not.toBeInTheDocument();
  });

  it('버튼을 누르면 선택한 종목으로 평가하고 결과를 이력 맨 앞에 붙인다', async () => {
    listRiskAssessmentsAction.mockResolvedValue([OLDER]);
    evaluateRiskAction.mockResolvedValue({ data: ASSESSMENT });
    render(<RiskPanel holding={HOLDING} criteria="## 재무" />);

    await userEvent.click(screen.getByRole('button', { name: /리스크 평가/ }));

    await waitFor(() => expect(screen.getByText('밸류에이션 부담이 큽니다.')).toBeInTheDocument());
    expect(evaluateRiskAction).toHaveBeenCalledWith('overseas', 'NVDA');
    expect(screen.getByText('거시 경제')).toBeInTheDocument();
    expect(screen.getByText('2분기 실적 발표')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reuters\.com/ })).toHaveAttribute(
      'href',
      'https://example.com/a',
    );
    // 종합은 '높음', 항목은 '보통'으로 각각 표시된다.
    expect(screen.getByText('보통')).toBeInTheDocument();
    // 새 평가가 이력 맨 앞에 붙어 목록이 생긴다.
    expect(screen.getByText('과거 평가 내역')).toBeInTheDocument();
  });

  it('검색을 안 돌린 평가에는 경고를 붙인다', async () => {
    evaluateRiskAction.mockResolvedValue({ data: { ...ASSESSMENT, searched: false } });
    render(<RiskPanel holding={HOLDING} criteria="## 재무" />);

    await userEvent.click(screen.getByRole('button', { name: /리스크 평가/ }));

    await waitFor(() => expect(screen.getByText(/웹 검색 없이/)).toBeInTheDocument());
  });

  it('실패하면 결과 대신 이유를 보여준다', async () => {
    evaluateRiskAction.mockResolvedValue({ error: 'Gemini가 설정되지 않았습니다.' });
    render(<RiskPanel holding={HOLDING} criteria="## 재무" />);

    await userEvent.click(screen.getByRole('button', { name: /리스크 평가/ }));

    await waitFor(() =>
      expect(screen.getByText('Gemini가 설정되지 않았습니다.')).toBeInTheDocument(),
    );
    expect(screen.queryByText('종합 리스크')).not.toBeInTheDocument();
  });

  it('평가 기준을 고쳐 저장할 수 있다', async () => {
    saveRiskCriteriaAction.mockResolvedValue(null);
    render(<RiskPanel holding={HOLDING} criteria="## 재무" />);

    await userEvent.click(screen.getByRole('button', { name: '평가 기준' }));
    await userEvent.click(screen.getByRole('button', { name: /편집/ }));

    const textarea = screen.getByRole('textbox');
    await waitFor(() => expect(textarea).toHaveFocus());
    await userEvent.clear(textarea);
    await userEvent.type(textarea, '## 수급');
    await userEvent.click(screen.getByRole('button', { name: /확인/ }));

    await waitFor(() => expect(saveRiskCriteriaAction).toHaveBeenCalledWith('## 수급'));
  });
});
