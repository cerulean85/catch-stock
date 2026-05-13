# Auth Spec

회원가입 / 로그인 / 로그아웃 / 회원탈퇴 사양.

## 1. 정책 요약

| 항목 | 내용 |
|------|------|
| 가입 수단 | Google 소셜 로그인 (단일 수단) |
| 가입 자동화 | 최초 Google 로그인 시 자동 가입 (별도 폼 없음) |
| 세션 | DB 기반 세션 (account/session 행으로 관리) |
| 로그아웃 | 헤더 메뉴 → 즉시 처리, 별도 확인 불필요 |
| 회원탈퇴 | 헤더 메뉴 → 확인 다이얼로그 → DB에서 회원·세션·연결계정 모두 삭제 |
| 보호 라우트 | 현재 시점 없음(스크리너는 공개). 후속 기능에서 도입 예정 |

## 2. 기술 스택

- **Auth.js v5** (`next-auth@latest` 기준 v5 라인) — Google Provider
- **Drizzle ORM + Drizzle Adapter** (`@auth/drizzle-adapter`)
- **Neon Serverless Postgres** (`@neondatabase/serverless`)
- 세션 전략: `strategy: "database"`

## 3. 환경 변수

`.env.example`에 명시. 운영/개발 모두 필요.

| 변수 | 용도 |
|------|------|
| `DATABASE_URL` | Neon Postgres 연결 문자열 (`postgres://…?sslmode=require`) |
| `AUTH_SECRET` | Auth.js JWT/세션 암호화 (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |
| `AUTH_URL` | (선택) 배포 URL. 기본 `http://localhost:3000` |

## 4. 데이터 모델

[data-model.md](./data-model.md) 참조. Auth.js Drizzle 어댑터 표준 스키마(`users`, `accounts`, `sessions`, `verification_tokens`)를 그대로 사용.

## 5. URL / 라우트

| 경로 | 종류 | 설명 |
|------|------|------|
| `/login` | Page | Google 로그인 버튼 + 약관/개인정보 링크 |
| `/api/auth/*` | Auth.js Handler | OAuth callback / sign-in / sign-out |
| `/api/account/delete` | Route Handler `DELETE` | 본인 계정 영구 삭제 |
| `/terms` | Page | 이용약관 |
| `/privacy` | Page | 개인정보처리방침 |

## 6. 회원가입 플로우

1. 사용자가 헤더 또는 `/login`에서 "Google로 시작하기" 클릭
2. Auth.js가 `/api/auth/signin/google`로 라우팅 → Google OAuth
3. 콜백 시 어댑터가 `users`/`accounts` 행 자동 생성
4. `sessions` 행 생성 + 쿠키 발급 → 홈으로 리다이렉트
5. 헤더가 사용자 아바타로 변경됨

## 7. 로그아웃

1. 헤더 → 사용자 메뉴 → "로그아웃" 클릭
2. `signOut()` 호출 → 세션 삭제 + 쿠키 만료
3. 별도 확인 다이얼로그 없음 (가역적 행동이라 마찰 최소화)

## 8. 회원탈퇴

1. 헤더 → 사용자 메뉴 → "회원탈퇴" 클릭
2. **확인 다이얼로그**: "정말로 탈퇴하시겠습니까? 모든 데이터가 영구 삭제됩니다." + [취소] / [탈퇴하기]
3. 탈퇴 확정 → `DELETE /api/account/delete` 호출
4. 서버는 현재 세션의 사용자 ID로 다음을 트랜잭션으로 삭제:
   - `sessions` (해당 user)
   - `accounts` (해당 user)
   - `users` 행 자체
5. 클라이언트는 응답 200 시 `signOut({ redirect: true, redirectTo: '/' })` 호출
6. 실패 시 토스트/에러 메시지

> 후속 단계에 사용자 데이터(즐겨찾기, 메모 등)가 추가되면 동일 트랜잭션 안에서 함께 삭제. ON DELETE CASCADE를 우선 사용.

## 9. UI 컴포넌트

| 컴포넌트 | 위치 | 설명 |
|---------|------|------|
| `SignInButton` | `features/auth/ui` | Google 로고 + "Google로 시작하기" |
| `UserMenu` | `features/auth/ui` | 헤더 우측 드롭다운 (아바타 → 로그아웃/탈퇴/약관) |
| `DeleteAccountDialog` | `features/auth/ui` | 확인 다이얼로그 (Radix Dialog 기반) |
| `Header` | `shared/ui` | 로고, 테마 토글, UserMenu / SignInButton |

아이콘: 이모지 사용 금지. `lucide-react` (`LogIn`, `LogOut`, `Trash2`, `User`, `Sun`, `Moon`)와 Google 로고 SVG inline 사용.

## 10. 보안 노트

- 모든 OAuth secret은 서버 전용 환경변수.
- `/api/account/delete`는 서버에서 `auth()`로 세션 검증. 미인증 시 401.
- CSRF: Auth.js가 자동 처리. 자체 라우트는 same-site 쿠키 기반이라 GET 미사용.
- 비밀번호/이메일 로그인은 v1 범위 외.

## 11. 테스트 / 검증

- 빌드 통과 (`npm run build`)
- `auth.config.ts` 단위 테스트는 사실상 통합 테스트라 v1에선 생략. 유틸 함수 (있다면) 별도 테스트.
- 수동 시나리오:
  1. 헤더 "로그인" → Google → 콜백 → 헤더 아바타 표시
  2. 사용자 메뉴 → 로그아웃 → 헤더 "로그인"으로 복귀
  3. 사용자 메뉴 → 회원탈퇴 → 다이얼로그 확인 → 로그아웃 + DB에서 행 삭제 확인
