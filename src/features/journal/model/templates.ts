export const TEMPLATE_KEYS = ['buy', 'analysis', 'reflection'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  buy: '매수 일지',
  analysis: '분석 일지',
  reflection: '반성 일지',
};

export const TEMPLATES: Record<TemplateKey, string> = {
  buy: `## 진입 근거

-

## 목표가 / 손절가

| 구분 | 가격 |
| --- | --- |
| 목표가 |  |
| 손절가 |  |

## 메모

-
`,
  analysis: `## 펀더멘털

-

## 기술적 분석

-

## 리스크

-

## 결론

-
`,
  reflection: `## 무엇을 했는가

-

## 왜 그렇게 했는가

-

## 다음에 어떻게 할 것인가

- [ ]
- [ ]
`,
};

export function isTemplateKey(value: unknown): value is TemplateKey {
  return typeof value === 'string' && (TEMPLATE_KEYS as readonly string[]).includes(value);
}
