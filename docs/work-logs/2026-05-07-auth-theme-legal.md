# 2026-05-07 — auth + theme + legal

## 한 일

### Spec 정리
- `docs/spec/auth.md` 회원가입/로그인/로그아웃/회원탈퇴 정책·플로우·환경변수
- `docs/spec/data-model.md` Auth.js Drizzle 표준 스키마 + Neon HTTP 드라이버
- `docs/spec/theme.md` 라이트/다크(블랙) 팔레트 + next-themes 정책
- `docs/spec/legal.md` 약관/개인정보 페이지 구성·모바일 최적화 가이드
- `docs/spec/CONCEPT.md` 인덱스 갱신

### 인프라
- 의존성: `next-auth@beta` (v5), `@auth/drizzle-adapter`, `drizzle-orm`, `@neondatabase/serverless`, `next-themes`, `drizzle-kit`, `dotenv`
- shadcn 컴포넌트 추가: `dialog`, `dropdown-menu`, `avatar`, `separator`
- `.env.example`: DATABASE_URL / AUTH_SECRET / AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET / AUTH_URL
- `drizzle.config.ts`, `npm run db:{generate,migrate,push}` 스크립트

### DB 레이어 (`src/shared/db/`)
- `schema.ts`: Auth.js 표준 4테이블 (`users`, `accounts`, `sessions`, `verificationTokens`). FK `ON DELETE CASCADE`로 회원탈퇴 시 자동 정리.
- `client.ts`: Neon HTTP 드라이버 + `server-only`.

### Auth feature (`src/features/auth/`)
- `model/auth.ts`: NextAuth v5 + DrizzleAdapter + Google Provider, `session.strategy='database'`, `pages.signIn='/login'`, AUTH_SECRET fallback.
- `model/handlers.ts`: `handlers` re-export → `app/api/auth/[...nextauth]/route.ts`.
- `api/actions.ts`: 서버 액션 `signInWithGoogle`, `signOutAction`, `deleteAccountAction`.
- `api/delete-account.ts`: `deleteUserById` (CASCADE로 `accounts`/`sessions` 동시 정리).
- `app/api/account/delete/route.ts`: `DELETE` 메서드 + `auth()` 검증.
- UI: `SignInButton`, `UserMenu` (드롭다운 + 약관/개인정보/로그아웃/탈퇴), `DeleteAccountDialog`, `GoogleIcon`.

### Theme feature (`src/features/theme/`)
- `ThemeProvider` (next-themes, `attribute="class"`, `enableSystem`)
- `ThemeToggle` (드롭다운: 라이트/다크/시스템, lucide Sun·Moon·Monitor)
- `globals.css`: `.dark` 팔레트를 oklch(0 0 0) 기반 블랙 계열로 교체

### Legal feature (`src/features/legal/`)
- `LegalLayout`, `LegalSection`: 모바일 우선 컨테이너 (`max-w-screen-md`, `text-[15px] leading-relaxed`, `pb-[env(safe-area-inset-bottom)+...]`).
- `TermsContent` 9조 + 부칙
- `PrivacyContent` 10조 (Google·Neon 위탁처리 명시, 탈퇴 즉시 파기)

### App shell
- `src/shared/ui/Header.tsx`: 서버 컴포넌트, `auth()` 결과로 `SignInButton` ↔ `UserMenu` 토글 + `ThemeToggle`.
- `src/shared/ui/Footer.tsx`: 약관/개인정보 링크.
- `src/app/layout.tsx`: `<html lang="ko" suppressHydrationWarning>` + `ThemeProvider` + Header/Footer 마운트, `viewport.themeColor` light/dark.
- `src/app/login/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`: 각 진입점.
- `src/app/page.tsx`: 헤더 중복 제거, 컨테이너만 유지.

## 검증

- `npm run test`: 11/11 통과 (기존 RSI/스크리너 테스트 유지)
- `npm run build`: 성공. 라우트: `/`, `/login`, `/terms`, `/privacy`, `/api/auth/[...nextauth]`, `/api/account/delete`, `/api/screener`
- 런타임 smoke (`npm run dev`):
  - `GET /` → 200
  - `GET /login` → 200, "Google로 시작하기" 버튼 + 약관/개인정보 링크 렌더
  - `GET /terms` → 200
  - `GET /privacy` → 200
- HTML 검증: 헤더 트리거가 단일 `<button>`으로 렌더 (nested `<button>` 이슈 해결).

## 결정 사항 / 교훈

- Auth.js v5 (beta) + Drizzle Adapter + Neon HTTP 드라이버. 세션 전략은 **database**로, 회원탈퇴 시 `users` 행 한 번 삭제로 모든 OAuth/세션이 CASCADE 정리됨.
- shadcn이 새 버전부터 **Base UI** (`@base-ui/react`) 기반. Radix의 `asChild`가 아니라 Base UI의 `render={<Component .../>}` prop을 사용하거나, 트리거 자체가 `<button>`을 emit하므로 wrapper Button 대신 `buttonVariants()` 클래스만 적용해 단일 button을 유지.
- DB 미연결 환경에서도 비로그인 페이지가 200을 반환하도록, `client.ts`에 placeholder URL을 fallback으로 두고 Auth.js의 `secret`도 dev fallback 추가.

## 운영 시 필요한 작업 (사용자)

1. **Neon 프로젝트 생성** → connection string을 `DATABASE_URL`에 설정.
2. **Google Cloud Console** OAuth 클라이언트 생성 → `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` 설정. Redirect URI: `{AUTH_URL}/api/auth/callback/google`.
3. `AUTH_SECRET=$(openssl rand -base64 32)` 생성 후 환경변수 등록 (배포 환경별).
4. `npm run db:push` (또는 `db:generate` + `db:migrate`)로 스키마 적용.

## 남은 일 / 후속

- 보호 라우트 도입 시 `auth()` 검증 + redirect 패턴을 헬퍼로 추출.
- 회원탈퇴 후 도메인 데이터(즐겨찾기 등) 추가될 때 ON DELETE CASCADE 또는 명시 트랜잭션.
- 다국어 (i18n) 도입 시 약관 텍스트를 별도 리소스로 분리.
- `auth.config.ts`로 edge-safe 분리 (middleware 추가 시).
