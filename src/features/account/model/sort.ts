import type { Holding } from './types';

export const HOLDING_SORT_KEYS = [
  'name',
  'quantity',
  'avgPrice',
  'currentPrice',
  'evalAmount',
  'pnlAmount',
] as const;
export type HoldingSortKey = (typeof HOLDING_SORT_KEYS)[number];

export type SortDirection = 'asc' | 'desc';

export interface HoldingSort {
  key: HoldingSortKey;
  direction: SortDirection;
}

/** 처음 누를 때의 방향: 이름은 가나다순, 숫자는 큰 값부터가 자연스럽다. */
export function defaultDirection(key: HoldingSortKey): SortDirection {
  return key === 'name' ? 'asc' : 'desc';
}

/** 같은 컬럼을 다시 누르면 방향만 뒤집고, 다른 컬럼이면 그 컬럼의 기본 방향으로. */
export function nextSort(current: HoldingSort | null, key: HoldingSortKey): HoldingSort {
  if (current?.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key, direction: defaultDirection(key) };
}

/** 정렬된 새 배열을 반환한다(입력은 건드리지 않음). sort가 null이면 원래 순서 그대로. */
export function sortHoldings(
  holdings: Holding[],
  sort: HoldingSort | null,
  locale = 'ko-KR',
): Holding[] {
  if (!sort) return holdings;

  const sign = sort.direction === 'asc' ? 1 : -1;
  const compare = (a: Holding, b: Holding) => {
    if (sort.key === 'name') {
      return a.name.localeCompare(b.name, locale) * sign;
    }
    return (a[sort.key] - b[sort.key]) * sign;
  };

  // 값이 같으면 종목코드로 고정해 순서가 흔들리지 않게 한다.
  return [...holdings].sort((a, b) => compare(a, b) || a.code.localeCompare(b.code));
}
