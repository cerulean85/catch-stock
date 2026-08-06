# Investment Journal — v1 Scope

[../spec/investment-journal.md](./investment-journal.md)의 전체 명세 중 외부 의존을 빼고 v1에서 실제로 만드는 범위를 명시.

## 1. v1 범위

### 포함 (in)

| 항목 | 비고 |
|------|------|
| CRUD (생성/조회/수정/삭제) | 본인 글만. 인증 필수 |
| 종목 다중 연결 | `tickers: string[]` (자유 입력 + sp500.json 자동완성 힌트) |
| 제목, 작성일시(`tradedAt`), 본문(마크다운) | 필수 |
| 태그 다중 입력 (자유) | `tags: string[]`, 최대 15개 |
| 투자 유형 다중 선택 | 매수/매도/보유/분석/계획/반성 |
| 거래 정보 | 수량/단가/수수료, 총액은 자동 표시 |
| 감정 지수 1~5 | 텍스트 라벨 (매우 부정 ~ 매우 긍정), 이모지 사용 안 함 |
| 투자 기간 | 단기/중기/장기 |
| 목표/실제 수익률 (%) | 단순 숫자 입력 (자동 계산 없음) |
| 마크다운 에디터 (split view) | textarea + react-markdown live preview, GFM 지원 |
| 템플릿 | 매수 / 분석 / 반성 — 본문 프리셋 |
| 목록 검색·필터 | 제목/본문 부분 일치, 태그·티커·투자 유형 필터 |

### 제외 (out, 후속 spec)

| 항목 | 사유 |
|------|------|
| 이미지 드래그 업로드 | 객체 스토리지(예: S3, R2) 미준비. 외부 URL 링크는 마크다운으로 가능 |
| 첨부 파일 (PDF 등) | 동상 |
| KaTeX 수식 | rehype-katex + 스타일 추가 부담. 후속 |
| AI 자동 태그 추천 | LLM 연동 필요 |
| AI 보조 작성 (Grok) | 명세에도 "예정" 표기 |
| URL 링크 미리보기/파싱 | OG 메타 fetch 인프라 필요 |
| HTML 본문 별도 저장 | 렌더링은 클라이언트에서 react-markdown으로 충분 |
| 이모지 감정 (😀 등) | CLAUDE.md 가이드: 이모지로 떼우지 않기 |

## 2. 데이터 모델 (Drizzle)

테이블: `journal`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| `id` | text PK | uuid |
| `userId` | text FK → user.id ON DELETE CASCADE | |
| `title` | text NOT NULL | ≤ 100자(앱 레벨 검증) |
| `content` | text NOT NULL | 마크다운 원본 |
| `tickers` | text[] NOT NULL DEFAULT '{}' | |
| `tags` | text[] NOT NULL DEFAULT '{}' | |
| `tradeTypes` | text[] NOT NULL DEFAULT '{}' | enum 문자열 모음 |
| `tradeQty` | numeric | nullable |
| `tradePrice` | numeric | nullable |
| `tradeFee` | numeric | nullable |
| `sentiment` | smallint | nullable, 1~5 |
| `horizon` | text | nullable, `'short'`/`'mid'`/`'long'` |
| `targetReturn` | numeric | nullable, % |
| `actualReturn` | numeric | nullable, % |
| `tradedAt` | timestamp NOT NULL | 사용자 시각, 기본 `now()` |
| `createdAt` | timestamp NOT NULL DEFAULT now() | |
| `updatedAt` | timestamp NOT NULL DEFAULT now() | |

회원탈퇴 시 ON DELETE CASCADE로 함께 삭제.

## 3. URL / 라우트

| 경로 | 설명 |
|------|------|
| `/journal` | 본인 일지 목록 + 검색·필터 |
| `/journal/new` | 새 일지 작성 |
| `/journal/[id]` | 상세 보기 |
| `/journal/[id]/edit` | 수정 |

전 라우트 인증 요구. 비로그인 시 `/login`으로 리다이렉트.

CRUD는 **server actions**로 처리 (`createJournal`, `updateJournal`, `deleteJournal`). 전용 REST 라우트는 v1에서 만들지 않음.

## 4. 마크다운 렌더링 / 보안

- 라이브러리: `react-markdown` + `remark-gfm`. 표/체크박스/코드/인용 지원.
- 본문은 사용자 본인이 작성하고 본인에게만 보임 → 그래도 react-markdown 기본 동작은 raw HTML 비활성. `rehype-raw` 사용 안 함.
- 코드 블록 신택스 하이라이트는 v1에선 생략(필요 시 후속에 highlight.js 추가).

## 5. 템플릿 (`features/journal/model/templates.ts`)

키-값 형태 3종:
- `buy` (매수): 진입 근거/목표가/손절가/메모
- `analysis` (분석): 펀더멘털/기술적/리스크/결론
- `reflection` (반성): 무엇이/왜/다음에

`/journal/new?template=buy` 식으로 쿼리 파라미터로 진입 시 본문 프리셋 주입.

## 6. UI 구성

### `/journal` 목록
- 상단 액션: "새 일지 작성" + 템플릿 드롭다운
- 검색 박스 (debounce 300ms, URL `?q=`)
- 칩 필터: 투자 유형, 감정, 보유 기간 (URL 동기화 생략, 클라이언트 상태)
- 카드 그리드: 제목 / 발췌 / 티커 칩 / 태그 칩 / `tradedAt` / 감정·기간

### `/journal/new`, `/journal/[id]/edit`
- 좌측: 폼 (제목, 종목, 태그, 투자 유형, 거래 정보, 감정/기간/목표·실제 수익률, 작성일시)
- 우측: 마크다운 에디터 (textarea | preview 토글; sm 이하에서는 탭으로 전환)
- 하단: 저장 / 취소

### `/journal/[id]`
- 메타: 제목, tradedAt, 티커/태그 칩
- 거래 정보 카드 (있을 때만)
- 본문(마크다운 렌더)
- 액션: 수정, 삭제(확인 다이얼로그)

## 7. 검증

- `npm run build` 통과
- `npm run test` 통과
- 단위 테스트:
  - 템플릿 매핑 (`templates.ts`)
  - 타이틀 길이 검증
- 수동 시나리오 (DB 연결 후): 작성 → 목록 노출 → 상세 → 수정 → 삭제 → 회원탈퇴 시 함께 삭제

## 8. 비범위 — 후속 작업 거리

- 이미지/첨부 업로드 (Cloudflare R2 또는 Vercel Blob)
- KaTeX
- AI 보조 작성/태그 추천
- 정렬·페이지네이션 고도화
- 종목별 통계 (수익률 분포, 빈도)
- Export (CSV, Markdown 묶음)
