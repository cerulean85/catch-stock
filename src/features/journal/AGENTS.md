# journal feature

투자 일지 CRUD. v1 범위는 [docs/spec/investment-journal-v1.md](../../../docs/spec/investment-journal-v1.md) 기준.

- DB: `journals` 테이블 (`shared/db/schema.ts`). FK `userId` ON DELETE CASCADE.
- 서버 진입은 server actions만 사용 (`api/actions.ts`). 별도 REST 라우트 없음.
- 사용자 입력은 `model/validate.ts::parseJournalInput` 한 곳에서 검증. 비즈니스 규칙(제목 길이, 티커 필수, 감정 1~5, 등)은 모두 여기에 모음.
- DB 행 → 도메인 객체 변환은 `api/server.ts::toJournal`만이 담당.
- 마크다운 렌더는 `ui/MarkdownPreview.tsx` 한 곳에서. raw HTML은 비활성(`react-markdown` 기본). XSS 방지.
- 모든 페이지에서 `auth()` 검증 필수. 미인증 시 `redirect('/login')`.
- 새 필드 추가 시: schema → types → validate → form 순으로 일관되게 확장.
