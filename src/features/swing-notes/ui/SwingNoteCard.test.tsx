import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const save = vi.fn<(content: string) => Promise<null>>(async () => null);
vi.mock('../api/actions', () => ({
  saveSwingNoteAction: (content: string) => save(content),
}));

// 골디락스 패널은 서버 액션을 끌고 들어온다. 메모 동작 테스트에는 필요 없다.
vi.mock('@/features/goldilocks', () => ({
  GoldilocksPanel: () => <div data-testid="goldilocks" />,
}));

const { SwingNoteCard } = await import('./SwingNoteCard');

describe('SwingNoteCard', () => {
  it('제목과 줄 단위 목록을 보여준다', () => {
    render(<SwingNoteCard content={'20일선 눌림\n실적 후 첫 조정'} scan={null} />);

    expect(screen.getByRole('heading', { name: '중기 스윙 골디락스' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('편집 → 확인 시 저장하고 읽기 전용으로 돌아간다', async () => {
    const user = userEvent.setup();
    render(<SwingNoteCard content="" scan={null} />);

    expect(screen.getByText(/아직 적어둔 내용이 없습니다/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '편집' }));
    await user.type(screen.getByRole('textbox'), '금리 하락 국면 대형주');
    await user.click(screen.getByRole('button', { name: /확인/ }));

    expect(save).toHaveBeenCalledWith('금리 하락 국면 대형주');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('금리 하락 국면 대형주');
  });
});
