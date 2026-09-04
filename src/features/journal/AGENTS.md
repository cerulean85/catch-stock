# journal feature

투자 일지 CRUD. v1 범위는 [docs/spec/investment-journal-v1.md](../../../docs/spec/investment-journal-v1.md) 기준.

- DB: `journals` 테이블 (`shared/db/schema.ts`). FK `userId` ON DELETE CASCADE.
- 서버 진입은 server actions만 사용 (`api/actions.ts`). 별도 REST 라우트 없음.
- 사용자 입력은 `model/validate.ts::parseJournalInput` 한 곳에서 검증. 비즈니스 규칙(필수값, 제목 길이, 감정 1~5, 등)은 모두 여기에 모음. 필수는 제목뿐이고, 본문은 발행 시에만 필수. 종목·태그는 선택.
- DB 행 → 도메인 객체 변환은 `api/server.ts::toJournal`만이 담당.
- 마크다운 렌더는 `ui/MarkdownPreview.tsx` 한 곳에서. raw HTML은 비활성(`react-markdown` 기본). XSS 방지.
- 본문 형식은 `journal.contentFormat` = `markdown` | `text`. 기본값·기존 행은 `markdown`. `text`는 상세에서 마크다운 렌더 없이 `whitespace-pre-wrap`으로 그대로 출력하고, 편집기에서는 미리보기·이미지 삽입을 감춘다. 마크다운 편집기의 미리보기는 기본 접힘(`edit` 모드)이고 분할/미리보기 버튼으로 펼친다.
- 모든 페이지에서 `auth()` 검증 필수. 미인증 시 `redirect('/login')`.
- 새 필드 추가 시: schema → types → validate → form 순으로 일관되게 확장.
- 라벨(투자 유형/감정/기간/리스크) → i18n 키 매핑은 `model/labels.ts` 한 곳에서. UI에서 중복 정의 금지.
- 거래 지표(총액/손익/수익률) 계산은 `model/metrics.ts::computeTradeMetrics` 순수 함수만 사용. 통계·정렬·표시 모두 이걸 재사용.
- 내보내기는 서버 액션이 문자열(CSV/MD)을 반환하고 다운로드는 클라이언트(`ui/download.ts`)가 처리. 파일 다운로드용 REST 라우트는 두지 않음.
- 이미지 업로드는 `BLOB_READ_WRITE_TOKEN`이 있을 때만 활성(`uploadJournalImageAction`). 미설정 시 UI 숨김, 외부 URL 링크로 대체.
- 수정 저장은 낙관적 잠금: 폼의 `expectedUpdatedAt`와 DB `updatedAt` 불일치 시 충돌로 거부.
- 카테고리는 글 성격 1개(`journal.category` = `trade`(투자기록) | `market`(시황) | `study`(스터디)). 기본값·기존 행은 `trade`. 목록 필터는 `?category=`이고, UI는 목록 상단 상시 노출 탭(`ui/CategoryTabs.tsx`) — 셀렉트로 되돌리지 않음. 라벨은 `model/labels.ts::categoryLabel`.
- 임시저장은 DB 상태값(`journal.status` = `draft` | `published`). 초안은 본문·종목 없이 저장 가능하지만 제목은 필수(`validate.ts`). 발행된 일지는 다시 초안으로 되돌리지 않음. 통계(`getJournalStats`)는 초안 제외.
- 캘린더 보기는 `?view=calendar&month=YYYY-MM`. 날짜 계산(그리드·조회 범위·날짜별 묶기)은 `model/calendar.ts` 순수 함수만 사용. 서버는 시간대를 모르므로 그리드 범위를 앞뒤 하루씩 넓혀 조회하고, 실제 날짜 배치는 클라이언트가 사용자 시간대로 한다.
- AI 보조(태그 추천/본문 초안)는 `api/ai.ts`(`@anthropic-ai/sdk`, 모델 기본값 `claude-opus-4-8`, `JOURNAL_AI_MODEL`로 교체 가능). `ANTHROPIC_API_KEY`가 있을 때만 활성(`aiEnabled`), 없으면 UI 숨김.
