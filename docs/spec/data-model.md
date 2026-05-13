# Data Model Spec

DB: **Neon Postgres**. ORM: **Drizzle**.

## 1. 스키마 (v1)

Auth.js Drizzle 어댑터 표준 스키마를 그대로 사용. 추가 도메인 테이블은 후속 단계에서 확장.

### `users`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| `id` | `text` PK | `crypto.randomUUID()` |
| `name` | `text` | nullable |
| `email` | `text` UNIQUE NOT NULL | |
| `emailVerified` | `timestamp` | nullable |
| `image` | `text` | nullable, Google profile picture URL |

### `accounts`

OAuth provider 연결 정보.

| 컬럼 | 타입 | 비고 |
|------|------|------|
| `userId` | `text` FK → `users.id` ON DELETE CASCADE | |
| `type` | `text` | "oauth" |
| `provider` | `text` | "google" |
| `providerAccountId` | `text` | Google sub |
| `refresh_token`, `access_token`, `expires_at`, `token_type`, `scope`, `id_token`, `session_state` | (Auth.js 표준) | |
| PK | (`provider`, `providerAccountId`) | |

### `sessions`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| `sessionToken` | `text` PK | |
| `userId` | `text` FK → `users.id` ON DELETE CASCADE | |
| `expires` | `timestamp` NOT NULL | |

### `verification_tokens`

(Auth.js 호환용 — Google OAuth만 쓸 때 실사용 X. 어댑터 인터페이스 충족 위해 유지.)

| 컬럼 | 타입 | 비고 |
|------|------|------|
| `identifier` | `text` | |
| `token` | `text` | |
| `expires` | `timestamp` | |
| PK | (`identifier`, `token`) | |

## 2. 관계 / 삭제 동작

- `accounts.userId`, `sessions.userId` 모두 `ON DELETE CASCADE`.
- 회원탈퇴 시 `users` 한 행 삭제만으로 OAuth/세션 자동 정리.

## 3. Drizzle 구성

| 항목 | 값 |
|------|----|
| 드라이버 | `drizzle-orm/neon-http` (HTTP, edge/node 호환) |
| 위치 | `src/shared/db/schema.ts`, `src/shared/db/client.ts` |
| 마이그레이션 | `drizzle-kit` |
| 설정 파일 | `drizzle.config.ts` |
| 마이그레이션 디렉토리 | `drizzle/` |

## 4. 마이그레이션 워크플로

| 명령 | 용도 |
|------|------|
| `npm run db:generate` | 스키마 변경 → SQL 마이그레이션 생성 |
| `npm run db:migrate` | 생성된 SQL을 Neon에 적용 |
| `npm run db:push` | 개발 시 빠른 스키마 동기화 (마이그레이션 파일 없이) |

## 5. 환경 변수

- `DATABASE_URL`: Neon connection string (`postgres://user:pass@host/db?sslmode=require`).
- 빌드 타임에 DB 접근 없음. 런타임에만 사용.

## 6. 비범위(현재)

- 즐겨찾기, 메모, 알림, 사용자 설정 테이블 — 후속 spec에서 추가.
- 멀티 OAuth Provider — Google만 지원.
