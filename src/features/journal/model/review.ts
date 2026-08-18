import type { Journal } from './types';
import { effectiveReturn } from './metrics';

/** 회고 메모 길이 상한. */
export const REVIEW_NOTE_MAX = 2000;

export const PROCESS_SCORE_MIN = 1;
export const PROCESS_SCORE_MAX = 5;
/** 이 점수 이상이면 판단 과정이 타당했던 매매로 본다. */
export const GOOD_PROCESS_SCORE = 4;

/**
 * 결과와 과정을 갈라 본 사분면.
 * 결과만 보면 운 좋게 번 매매와 실력으로 번 매매를 구분할 수 없다.
 */
export type Quadrant =
  | 'quadrantSkill' // 과정 좋음 + 이익 — 반복할 것
  | 'quadrantUnlucky' // 과정 좋음 + 손실 — 그대로 해도 되는 것
  | 'quadrantLucky' // 과정 미흡 + 이익 — 가장 위험한 것
  | 'quadrantDeserved'; // 과정 미흡 + 손실 — 고칠 것

/** 회고를 마쳤고 결과가 나온 일지만 사분면에 놓을 수 있다. */
export function quadrantOf(journal: Journal): Quadrant | null {
  if (journal.processScore == null) return null;
  const result = effectiveReturn(journal);
  if (result == null || result === 0) return null;

  const goodProcess = journal.processScore >= GOOD_PROCESS_SCORE;
  if (result > 0) return goodProcess ? 'quadrantSkill' : 'quadrantLucky';
  return goodProcess ? 'quadrantUnlucky' : 'quadrantDeserved';
}

export interface QuadrantBucket {
  key: Quadrant;
  count: number;
  journals: { id: string; title: string }[];
}

const ORDER: Quadrant[] = [
  'quadrantSkill',
  'quadrantUnlucky',
  'quadrantLucky',
  'quadrantDeserved',
];

/** 회고를 마친 일지를 사분면으로 나눈다. 빈 칸도 0으로 남겨 네 칸을 다 보여준다. */
export function computeQuadrants(journals: Journal[]): QuadrantBucket[] {
  const buckets = new Map<Quadrant, QuadrantBucket>(
    ORDER.map((key) => [key, { key, count: 0, journals: [] }]),
  );

  for (const journal of journals) {
    const quadrant = quadrantOf(journal);
    if (!quadrant) continue;
    const bucket = buckets.get(quadrant)!;
    bucket.count += 1;
    if (bucket.journals.length < 3) {
      bucket.journals.push({ id: journal.id, title: journal.title });
    }
  }

  return ORDER.map((key) => buckets.get(key)!);
}

/** 과정 점수가 유효한 범위인지. 아니면 저장하지 않는다. */
export function isValidProcessScore(score: number): boolean {
  return (
    Number.isInteger(score) && score >= PROCESS_SCORE_MIN && score <= PROCESS_SCORE_MAX
  );
}
