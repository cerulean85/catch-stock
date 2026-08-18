import type { GoldilocksCandidate } from './types';

function str(value: unknown): string {
  return String(value ?? '').trim();
}

/**
 * 미국 거래소 티커만 인정한다(BRK.B처럼 점·하이픈이 붙는 클래스 표기 포함).
 * 형식이 어긋나면 모델이 지어낸 값으로 보고 비운다 — 엉뚱한 종목을 조회하게 되기 때문이다.
 */
function toCode(value: unknown): string {
  const code = str(value).toUpperCase();
  return /^[A-Z]{1,5}([.-][A-Z]{1,2})?$/.test(code) ? code : '';
}

function toCandidates(value: unknown): GoldilocksCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const row = item as Record<string, unknown>;
    const name = str(row.name);
    // 이름이 없으면 목록에 띄울 수도, 상세를 열 수도 없다.
    if (!name) return [];
    return [
      {
        name,
        code: toCode(row.code),
        summary: str(row.summary),
        story: str(row.story),
        chart: str(row.chart),
        supply: str(row.supply),
        catalyst: str(row.catalyst),
        stopLoss: str(row.stopLoss),
      },
    ];
  });
}

export interface ParsedScan {
  candidates: GoldilocksCandidate[];
  note: string;
}

/** 모델 응답 본문을 탐색 결과로 바꾼다. 후보도 총평도 없으면 실패로 본다. */
export function parseScan(raw: string): ParsedScan | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }

  const candidates = toCandidates(parsed.candidates);
  const note = str(parsed.note);
  if (candidates.length === 0 && !note) return null;

  return { candidates, note };
}
