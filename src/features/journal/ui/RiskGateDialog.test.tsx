import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RiskGateDialog } from './RiskGateDialog';

describe('RiskGateDialog', () => {
  it('미체크 항목이 없으면 열리지 않는다', () => {
    render(
      <RiskGateDialog
        missing={null}
        principles=""
        riskCriteria=""
        onCancel={vi.fn()}
        onProceed={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('안 채운 항목과 내 원칙을 함께 보여준다', () => {
    render(
      <RiskGateDialog
        missing={['stopLoss', 'invalidation']}
        principles={'손절선 -8%는 지킨다\n실적 직전 신규 진입 금지'}
        riskCriteria={'## 재무\n- 부채비율 확인'}
        onCancel={vi.fn()}
        onProceed={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('손절/무효화 가격을 정함')).toBeInTheDocument();
    expect(screen.getByText('틀렸을 때의 조건을 적음')).toBeInTheDocument();
    // 원칙을 읽고 넘어가도록 옆에 띄운다.
    expect(screen.getByText('손절선 -8%는 지킨다')).toBeInTheDocument();
    expect(screen.getByText('- 부채비율 확인')).toBeInTheDocument();
  });

  it('비어 있는 메모는 제목까지 감춘다', () => {
    render(
      <RiskGateDialog
        missing={['stopLoss']}
        principles=""
        riskCriteria=""
        onCancel={vi.fn()}
        onProceed={vi.fn()}
      />,
    );
    expect(screen.queryByText('투자 원칙')).not.toBeInTheDocument();
    expect(screen.queryByText('평가 기준')).not.toBeInTheDocument();
  });

  it('막지 않는다 — 그래도 저장을 고를 수 있다', async () => {
    const onProceed = vi.fn();
    const onCancel = vi.fn();
    render(
      <RiskGateDialog
        missing={['stopLoss']}
        principles=""
        riskCriteria=""
        onCancel={onCancel}
        onProceed={onProceed}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '그래도 저장' }));
    expect(onProceed).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('돌아가서 체크를 누르면 저장하지 않고 닫는다', async () => {
    const onProceed = vi.fn();
    const onCancel = vi.fn();
    render(
      <RiskGateDialog
        missing={['stopLoss']}
        principles=""
        riskCriteria=""
        onCancel={onCancel}
        onProceed={onProceed}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '돌아가서 체크' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onProceed).not.toHaveBeenCalled();
  });
});
