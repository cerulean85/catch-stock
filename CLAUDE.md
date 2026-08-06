# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# 5. Source Of Truth

- 제품 요구사항과 API 계약은 `docs/specs/*.md`를 기준으로 봄
- 프로젝트 전역 작업 규칙은 이 루트 `AGENTS.md`를 기준으로 봄
- feature 전용 구현 규칙은 해당 feature 코드 옆의 `AGENTS.md`에 둠
- 새 기능 구현 전에는 관련 `docs/specs/*.md`를 먼저 확인합니다.

# 6. Build & Test

- 패키지 매니저 기본값은 `npm`임
- 개발 서버: `npm run dev`
- 프로덕션 빌드: `npm run build`
- 테스트: `npm run test`
- 테스트는 Vitest + React Testing Library를 기준으로 작성함

# 7. Tech Stack

- Language: TypeScript
- UI Library: React.js 19 + Next.js
- UI Components: Shadcn UI
- CSS Framework: TailwindCSS 4
- State Management: Zustand


# 8. Code & Folder Style

- Vite 프로젝트 생성 시 포함되는 ESLint와 별도로 Prettier를 반드시 설정
- ESLint: 코드의 논리적 오류(사용하지 않는 변수 등) 체크
- Prettier: 코드의 시각적 스타일(세미콜론, 들여쓰기) 통일
  - Prettier 기준: tab width 2, semi true, single quote true
- .vscode/settings.json 설정에 editor.formatOnSave: true를 추가하여 저장 시 자동으로 컨벤션이 맞춰지도록 설정
- 한 파일의 코드는 500줄을 넘어선 안됨
- 디렉토리는 FSD(Feature Slice Directory) 구조를 사용

# 9. Naming Convention

| 대상           | 컨벤션          | 예시                                 |
| -------------- | --------------- | ------------------------------------ |
| 컴포넌트 파일  | PascalCase      | "UserProfile.jsx, SubmitButton.tsx"  |
| 일반 함수/변수 | camelCase       | "const getData = () => {}, userName" |
| 폴더명         | kebab-case      | "user-profile/, auth-service/"       |
| 상수           | SNAKE_UPPERCASE | const API_BASE_URL = '...'           |
| 커스텀 훅      | use + camelCase | "useAuth.js, useLocalStorage.ts"     |
