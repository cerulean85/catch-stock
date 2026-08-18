import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoldilocksResult, GoldilocksScan } from '../model/types';

const scanGoldilocksAction = vi.fn<() => Promise<GoldilocksResult>>();

vi.mock('../api/actions', () => ({
  scanGoldilocksAction: () => scanGoldilocksAction(),
}));

const { GoldilocksPanel } = await import('./GoldilocksPanel');

const SCAN: GoldilocksScan = {
  id: 's1',
  createdAt: new Date('2026-08-07T05:30:00Z'),
  candidates: [
    {
      name: 'Credo Technology',
      code: 'CRDO',
      summary: 'HBM 밸류체인 2등주로 아직 시세를 내지 않았습니다.',
      story: '적자에서 흑자 전환 구간입니다.',
      chart: '20일선 지지 후 거래량이 말라붙었습니다.',
      supply: '외인·기관이 3주 연속 양매수 중입니다.',
      catalyst: '4분기 공장 증설 완공 예정입니다.',
      stopLoss: '60일선 이탈 시 -6%, 손익비 1:3.',
    },
    {
      name: 'Vertiv Holdings',
      code: 'VRT',
      summary: '원전 정책 수혜가 아직 반영되지 않았습니다.',
      story: '수주 잔고가 늘고 있습니다.',
      chart: '박스권 상단 돌파 직전입니다.',
      supply: '연기금이 조용히 모으고 있습니다.',
      catalyst: '체코 원전 본계약 예정.',
      stopLoss: '박스권 하단 이탈 시 -5%.',
    },
  ],
  note: '두 종목 모두 거래량 감소 구간입니다.',
  sources: [{ title: 'mt.co.kr', uri: 'https://example.com/a' }],
  searched: true,
  model: 'gemini-3.6-flash',
};

beforeEach(() => {
  scanGoldilocksAction.mockReset();
});

describe('GoldilocksPanel', () => {
  it('탐색한 적이 없으면 안내만 보여준다', () => {
    render(<GoldilocksPanel initial={null} />);

    expect(scanGoldilocksAction).not.toHaveBeenCalled();
    expect(screen.getByText(/아직 탐색한 적이 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '탐색' })).toBeInTheDocument();
  });

  it('저장된 탐색 결과와 탐색 시각을 보여준다', () => {
    render(<GoldilocksPanel initial={SCAN} />);

    // 2026-08-07T05:30Z = 한국시간 오후 2:30
    expect(screen.getByText(/탐색 시각/)).toBeInTheDocument();
    expect(screen.getByText(/2026\. 8\. 7\..*오후 2:30/)).toBeInTheDocument();
    expect(screen.getByText('Credo Technology')).toBeInTheDocument();
    expect(screen.getByText('CRDO')).toBeInTheDocument();
    expect(screen.getByText('Vertiv Holdings')).toBeInTheDocument();
  });

  it('항목을 고르면 그 종목의 상세를 보여준다', async () => {
    render(<GoldilocksPanel initial={SCAN} />);

    await userEvent.click(screen.getByRole('button', { name: /Credo Technology/ }));

    expect(screen.getByText('적자에서 흑자 전환 구간입니다.')).toBeInTheDocument();
    expect(screen.getByText('20일선 지지 후 거래량이 말라붙었습니다.')).toBeInTheDocument();
    expect(screen.getByText('외인·기관이 3주 연속 양매수 중입니다.')).toBeInTheDocument();
    expect(screen.getByText('4분기 공장 증설 완공 예정입니다.')).toBeInTheDocument();
    expect(screen.getByText('60일선 이탈 시 -6%, 손익비 1:3.')).toBeInTheDocument();
    // 상세를 보는 동안에는 다른 종목이 목록에 남지 않는다.
    expect(screen.queryByText('Vertiv Holdings')).not.toBeInTheDocument();
  });

  it('상세에서 목록으로 돌아갈 수 있다', async () => {
    render(<GoldilocksPanel initial={SCAN} />);

    await userEvent.click(screen.getByRole('button', { name: /Credo Technology/ }));
    await userEvent.click(screen.getByRole('button', { name: '목록으로' }));

    expect(screen.getByText('Vertiv Holdings')).toBeInTheDocument();
    expect(screen.queryByText('적자에서 흑자 전환 구간입니다.')).not.toBeInTheDocument();
  });

  it('탐색 버튼을 누르면 결과를 새로 받아 보여준다', async () => {
    scanGoldilocksAction.mockResolvedValue({ data: SCAN });
    render(<GoldilocksPanel initial={null} />);

    await userEvent.click(screen.getByRole('button', { name: '탐색' }));

    await waitFor(() => expect(screen.getByText('Credo Technology')).toBeInTheDocument());
    expect(scanGoldilocksAction).toHaveBeenCalledTimes(1);
  });

  it('조건에 맞는 종목이 없으면 총평을 대신 보여준다', () => {
    render(
      <GoldilocksPanel
        initial={{ ...SCAN, candidates: [], note: '지금은 과열 구간이라 후보가 없습니다.' }}
      />,
    );

    expect(screen.getByText('지금은 과열 구간이라 후보가 없습니다.')).toBeInTheDocument();
  });

  it('실패하면 결과 대신 이유를 보여준다', async () => {
    scanGoldilocksAction.mockResolvedValue({ error: 'Gemini가 설정되지 않았습니다.' });
    render(<GoldilocksPanel initial={null} />);

    await userEvent.click(screen.getByRole('button', { name: '탐색' }));

    await waitFor(() =>
      expect(screen.getByText('Gemini가 설정되지 않았습니다.')).toBeInTheDocument(),
    );
  });

  it('검색을 안 돌린 결과에는 경고를 붙인다', () => {
    render(<GoldilocksPanel initial={{ ...SCAN, searched: false }} />);
    expect(screen.getByText(/웹 검색 없이/)).toBeInTheDocument();
  });
});
