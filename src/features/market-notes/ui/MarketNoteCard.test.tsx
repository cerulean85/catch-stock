import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MarketNoteCard } from './MarketNoteCard';

const save = vi.fn<(note: unknown) => Promise<null>>(async () => null);
vi.mock('../api/actions', () => ({
  saveMarketNoteAction: (note: unknown) => save(note),
}));

describe('MarketNoteCard', () => {
  it('개시 전·장 중·마감 후 메모를 순서대로 줄 단위 목록으로 보여준다', () => {
    render(
      <MarketNoteCard
        note={{ preOpen: '손절선 확인\n분할 매수 판단', intraday: '급등락 대응', postClose: '일지 기록' }}
      />,
    );

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['장 개시 전', '장 중', '장 마감 후']);

    const lists = screen.getAllByRole('list');
    expect(within(lists[0]).getAllByRole('listitem')).toHaveLength(2);
    expect(within(lists[1]).getAllByRole('listitem')).toHaveLength(1);
    expect(within(lists[2]).getAllByRole('listitem')).toHaveLength(1);
  });

  it('빈 칸은 안내 문구를 보여준다', () => {
    render(<MarketNoteCard note={{ preOpen: '', intraday: '', postClose: '' }} />);

    expect(screen.getAllByText('아직 메모가 없습니다.')).toHaveLength(3);
  });

  it('편집 → 확인 시 세 칸을 함께 저장하고 읽기 전용으로 돌아간다', async () => {
    const user = userEvent.setup();
    render(<MarketNoteCard note={{ preOpen: '기존 전', intraday: '', postClose: '기존 후' }} />);

    await user.click(screen.getByRole('button', { name: '편집' }));
    // 편집 진입 시 첫 칸으로 포커스가 옮겨간 뒤에 입력해야 한다.
    await waitFor(() => expect(screen.getByLabelText('장 개시 전')).toHaveFocus());
    await user.type(screen.getByLabelText('장 중'), '장 중 메모');
    await user.click(screen.getByRole('button', { name: /확인/ }));

    expect(save).toHaveBeenCalledWith({
      preOpen: '기존 전',
      intraday: '장 중 메모',
      postClose: '기존 후',
    });
    expect(screen.queryByLabelText('장 중')).not.toBeInTheDocument();
    expect(screen.getByText('장 중 메모')).toBeInTheDocument();
  });
});
