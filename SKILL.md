# Agent Workflows

## 1. 기능 구현

1. `docs/specs/` 스펙 파일 읽기 → 불명확하면 먼저 질문
2. FSD 구조로 `src/features/[name]/{ui, model, api, index.ts}` 생성
3. UI는 Shadcn UI 우선, 파일당 500줄 이하 유지
4. `npm run test` 실행 → 전체 통과 확인
5. `docs/work-logs/YYYY-MM-DD-[name].md` 작업 로그 작성

## 2. 버그 수정

1. Steps to Reproduce 정리
2. 실패하는 Vitest 테스트 먼저 작성
3. Root cause 파악 후 최소 범위로 수정
4. 테스트 통과 확인 → `npm run test` 전체 회귀 검증
5. `docs/features/` 관련 문서 업데이트

## 3. API 연동

1. Endpoint / Request / Response / 인증 방식 확인
2. `model/types.ts`에 TypeScript 타입 정의
3. `api/` 폴더에 공통 Axios 인스턴스 사용해 함수 작성 (에러 처리 포함)
4. React Query 등으로 컴포넌트에 바인딩, 로딩·에러·성공 상태 처리
5. `npm run test` 전체 통과 확인

## 4. 코드 리뷰 셀프 체크

- [ ] 파일당 500줄 이하
- [ ] 미사용 import·변수·console.log 제거
- [ ] `any` 타입 불필요하게 사용하지 않음
- [ ] 엣지 케이스(null, 빈 값, 네트워크 에러) 처리
- [ ] `npm run test` 통과
- [ ] PR 설명에 변경 이유·영향 범위·테스트 방법 포함
