import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setJournalPinnedAction = vi.fn<(id: string, pinned: boolean) => Promise<void>>();

// 서버 액션은 next-auth를 끌고 들어와 jsdom에서 뜨지 않는다.
vi.mock('../api/actions', () => ({
  setJournalPinnedAction: (id: string, pinned: boolean) => setJournalPinnedAction(id, pinned),
}));

const { JournalPinButton } = await import('./JournalPinButton');

beforeEach(() => {
  setJournalPinnedAction.mockReset();
  setJournalPinnedAction.mockResolvedValue(undefined);
});

describe('JournalPinButton', () => {
  it('고정되지 않은 일지는 고정 버튼으로 보인다', () => {
    render(<JournalPinButton id="j1" pinned={false} />);

    const button = screen.getByRole('button', { name: '상단에 고정' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('누르면 고정 상태를 서버에 알린다', async () => {
    render(<JournalPinButton id="j1" pinned={false} />);

    await userEvent.click(screen.getByRole('button', { name: '상단에 고정' }));

    await waitFor(() => expect(setJournalPinnedAction).toHaveBeenCalledWith('j1', true));
    // 서버 응답을 기다리지 않고 바로 눌린 모습으로 바뀐다.
    expect(screen.getByRole('button', { name: '고정 해제' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('이미 고정된 일지는 해제 버튼으로 보이고 해제를 보낸다', async () => {
    render(<JournalPinButton id="j2" pinned />);

    const button = screen.getByRole('button', { name: '고정 해제' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(button);

    await waitFor(() => expect(setJournalPinnedAction).toHaveBeenCalledWith('j2', false));
    expect(screen.getByRole('button', { name: '상단에 고정' })).toBeInTheDocument();
  });
});
