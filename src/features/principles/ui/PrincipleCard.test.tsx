import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PrincipleCard } from './PrincipleCard';

const save = vi.fn<(content: string) => Promise<null>>(async () => null);
vi.mock('../api/actions', () => ({
  savePrincipleAction: (content: string) => save(content),
}));

describe('PrincipleCard', () => {
  it('줄 단위로 목록 항목을 만든다', () => {
    render(<PrincipleCard content={'손절선 -8%\n\n실적 전 진입 금지'} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('손절선 -8%');
    expect(items[1]).toHaveTextContent('실적 전 진입 금지');
  });

  it('비어 있으면 안내 문구를 보여준다', () => {
    render(<PrincipleCard content="" />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText(/투자 원칙이 없습니다/)).toBeInTheDocument();
  });

  it('편집 → 확인 시 저장하고 읽기 전용으로 돌아간다', async () => {
    const user = userEvent.setup();
    render(<PrincipleCard content="기존 원칙" />);

    await user.click(screen.getByRole('button', { name: '편집' }));
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('기존 원칙');

    await user.clear(textarea);
    await user.type(textarea, '새 원칙');
    await user.click(screen.getByRole('button', { name: /확인/ }));

    expect(save).toHaveBeenCalledWith('새 원칙');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('새 원칙');
  });

  it('취소하면 편집 내용을 버린다', async () => {
    const user = userEvent.setup();
    render(<PrincipleCard content="기존 원칙" />);

    await user.click(screen.getByRole('button', { name: '편집' }));
    await user.type(screen.getByRole('textbox'), ' 수정중');
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.getByRole('listitem')).toHaveTextContent('기존 원칙');
  });
});
