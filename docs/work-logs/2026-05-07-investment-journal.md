# 2026-05-07 — investment journal v1

## 한 일

### Spec
- [docs/spec/investment-journal-v1.md](../spec/investment-journal-v1.md) — 전체 명세 중 v1 범위(외부 의존 제외) 명시. 포함/제외 표 + DB 스키마 + URL/라우트 + UI 구성.

### DB
- `src/shared/db/schema.ts`에 `journal` 테이블 추가 (`tickers`, `tags`, `tradeTypes` text[], 거래 정보 numeric, `sentiment` smallint, `horizon` text, `tradedAt`/`createdAt`/`updatedAt`). `userId` FK ON DELETE CASCADE.
- `npx drizzle-kit generate` → `drizzle/0001_mighty_hedge_knight.sql` 생성. (DB 적용은 사용자 작업 — `npm run db:push`)

### 의존성
- 추가: `react-markdown`, `remark-gfm`, `@tailwindcss/typography` (`@plugin`으로 globals.css에 등록).
- shadcn 컴포넌트 추가: `input`, `textarea`, `label`, `card`, `select`, `popover`.

### Feature (`src/features/journal/`)
- `model/types.ts` — TradeType/Horizon enum, 라벨, `Journal`/`JournalInput`/`JournalFilters`, 상수 (`TITLE_MAX=100`, `TAG_MAX_COUNT=15`)
- `model/templates.ts` — 매수/분석/반성 3종 마크다운 프리셋
- `model/validate.ts` — `parseJournalInput(FormData)` 단일 검증 진입점, `JournalValidationError`
- 단위 테스트 12개 (templates 2 + validate 5 + 기존 journal 5 + 기존 RSI/screener)
- `api/server.ts` — `listJournals`/`getJournal`/`createJournal`/`updateJournal`/`deleteJournal`. `userId` 스코프 항상 강제.
- `api/actions.ts` — server actions (`createJournalAction`, `updateJournalAction`, `deleteJournalAction`). `useActionState` 시그니처에 맞춤. 미인증 시 `/login` 리다이렉트.

### UI
- `MarkdownPreview` — `react-markdown` + `remark-gfm`, `prose` (typography 플러그인 적용), raw HTML 비활성으로 XSS 방지
- `MarkdownEditor` — 편집/분할/미리보기 모드 토글 (sm 미만에선 분할 숨김)
- `ChipInput` — 티커/태그용 칩 입력 (Enter/콤마로 추가, Backspace로 제거)
- `TradeTypeSelector` — 매수/매도/보유/분석/계획/반성 토글 칩 (이모지 사용 X)
- `JournalForm` — 제목/작성일시/종목/태그/투자 유형/거래 정보/감정/기간/목표·실제 수익률/본문(에디터). 에러 표시 + pending 상태.
- `JournalCard`, `JournalList`, `JournalListFilters` — 검색(debounce 300ms, URL 동기화) + 투자 유형 필터, ticker/tag 활성 칩 해제.
- `JournalDetail` — 메타/거래정보 카드/마크다운 본문 + 수정/삭제(확인 다이얼로그)
- `DeleteJournalButton` — shadcn Dialog 확인 후 server action 호출

### 라우트 (`src/app/journal/`)
- `/journal` — 목록 (검색·필터 search params 반영)
- `/journal/new` — 새 일지 (`?template=buy|analysis|reflection` 지원)
- `/journal/[id]` — 상세
- `/journal/[id]/edit` — 수정
- 모두 `auth()` 검증 → 미인증 시 `/login` redirect, `dynamic = 'force-dynamic'`.

### App shell
- `Header`에 "스크리너 / 투자 일지" 네비 추가 (sm 이상, 로그인 시에만 일지 노출)

## 검증

- `npm run test`: 19/19 통과 (RSI 7 + screener 4 + journal templates 2 + journal validate 5 + 기존 1)
- `npm run build`: 성공 (12개 라우트 모두 컴파일, 신규 4개 journal 라우트 포함)
- 런타임 smoke (dev):
  - `GET /journal` → 307 → `/login` ✓ (인증 게이트)
  - `GET /journal/new` → 307 → `/login` ✓
  - `GET /login` → 200 ✓
  - `GET /` → 200 ✓

## 결정 사항 / 제외

- 이미지 드래그 업로드, 첨부 파일, KaTeX, AI 자동 태그/보조 작성, URL 미리보기 — v1 제외 (외부 인프라/LLM 필요). spec에 후속 거리로 명시.
- 감정은 1~5 숫자 + 텍스트 라벨(매우 부정~매우 긍정). 이모지 사용 안 함(CLAUDE.md 가이드).
- REST API 라우트 별도로 만들지 않고 server actions만 사용 (Next 16 권장 패턴 + 폼 단순화).
- 마크다운 raw HTML 비활성으로 본인 데이터에서도 XSS 차단.
- 검색은 ILIKE + Postgres 배열 `@>` 연산자로 SQL 레벨 필터.

## 다음 단계 (사용자 작업)

1. `npm run db:push` (또는 `db:migrate`) — Neon에 `journal` 테이블 적용.
2. 로그인 후 `/journal/new`에서 작성 → `/journal` 목록에서 확인 → 상세 → 수정 → 삭제 → 회원탈퇴 시 함께 삭제되는지 확인.

## 후속 작업 거리

- 첨부/이미지 업로드 (Cloudflare R2 또는 Vercel Blob)
- KaTeX 수식 렌더
- 페이지네이션·정렬 옵션 고도화
- 종목별 통계(빈도, 평균 수익률 분포) 대시보드
- AI 보조: 본문 분석 → 태그 자동 제안 / 일지 초안 생성
- Export (Markdown 묶음, CSV)
