import { describe, expect, it } from 'vitest';
import { parseScan } from './parse';

const CANDIDATE = {
  name: 'Credo Technology',
  code: 'CRDO',
  summary: 'HBM 밸류체인 2등주로 아직 시세를 내지 않았습니다.',
  story: '적자에서 흑자 전환 구간입니다.',
  chart: '20일선 지지 후 거래량이 말라붙었습니다.',
  supply: '외인·기관이 3주 연속 양매수 중입니다.',
  catalyst: '4분기 공장 증설 완공 예정입니다.',
  stopLoss: '60일선 이탈 시 -6%, 손익비 1:3.',
};

describe('parseScan', () => {
  it('정상 JSON을 그대로 읽는다', () => {
    const result = parseScan(JSON.stringify({ candidates: [CANDIDATE], note: '총평' }));
    expect(result?.candidates).toHaveLength(1);
    expect(result?.candidates[0]).toEqual(CANDIDATE);
    expect(result?.note).toBe('총평');
  });

  it('코드펜스와 앞뒤 설명이 섞여도 JSON만 잘라낸다', () => {
    const raw = '찾았습니다.\n```json\n' + JSON.stringify({ candidates: [CANDIDATE], note: '' }) + '\n```';
    expect(parseScan(raw)?.candidates[0].name).toBe('Credo Technology');
  });

  it('티커는 대문자로 맞추고 클래스 표기도 받는다', () => {
    const raw = JSON.stringify({
      candidates: [
        { ...CANDIDATE, name: '소문자', code: 'crdo' },
        { ...CANDIDATE, name: '클래스', code: 'BRK.B' },
        { ...CANDIDATE, name: '하이픈', code: 'RDS-A' },
      ],
      note: '',
    });
    expect(parseScan(raw)!.candidates.map((c) => c.code)).toEqual(['CRDO', 'BRK.B', 'RDS-A']);
  });

  it('티커 형식이 아니면 비운다', () => {
    const raw = JSON.stringify({
      candidates: [
        { ...CANDIDATE, name: '한국코드', code: '042700' },
        { ...CANDIDATE, name: '너무김', code: 'ABCDEFG' },
        { ...CANDIDATE, name: '설명문', code: '확인 불가' },
      ],
      note: '',
    });
    // 지어낸 코드로 엉뚱한 종목을 조회하게 두느니 이름만 남긴다.
    expect(parseScan(raw)!.candidates.map((c) => c.code)).toEqual(['', '', '']);
  });

  it('이름이 없는 후보는 버린다', () => {
    const raw = JSON.stringify({
      candidates: [{ ...CANDIDATE, name: '' }, CANDIDATE],
      note: '',
    });
    expect(parseScan(raw)?.candidates).toHaveLength(1);
  });

  it('후보가 없어도 총평이 있으면 결과로 본다', () => {
    const result = parseScan('{"candidates":[],"note":"조건에 맞는 종목이 없습니다."}');
    expect(result?.candidates).toEqual([]);
    expect(result?.note).toBe('조건에 맞는 종목이 없습니다.');
  });

  it('후보도 총평도 없으면 실패로 본다', () => {
    expect(parseScan('{"candidates":[],"note":""}')).toBeNull();
    expect(parseScan('죄송합니다. 찾지 못했습니다.')).toBeNull();
    expect(parseScan('{ "candidates": ')).toBeNull();
  });
});
