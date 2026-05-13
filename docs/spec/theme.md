# Theme Spec

라이트 / 다크 모드 사양. 다크는 **블랙 계열(near-pure black)**.

## 1. 정책

- 시스템 테마 자동 감지 (기본).
- 헤더 우측 토글로 수동 전환: System → Light → Dark.
- 선택값은 `localStorage`에 저장 (next-themes 기본).
- FOUC 방지: `suppressHydrationWarning` + `<ThemeProvider>` 루트 마운트.

## 2. 라이브러리

- `next-themes` — Next.js + Tailwind 4 + shadcn 표준 조합.
- shadcn은 `dark` 클래스를 사용 (이미 `globals.css`에 `@custom-variant dark` 정의).

## 3. 다크 팔레트 (블랙 계열)

`src/app/globals.css`의 `.dark` 블록을 다음과 같이 오버라이드.

| 변수 | 값 | 용도 |
|------|-----|------|
| `--background` | `oklch(0 0 0)` | 페이지 배경 = 순수 검정 |
| `--card` | `oklch(0.06 0 0)` | 카드/컨테이너 (배경 대비 약하게 들림) |
| `--popover` | `oklch(0.06 0 0)` | 메뉴/툴팁 |
| `--muted` | `oklch(0.10 0 0)` | 보조 면 |
| `--border` | `oklch(0.18 0 0)` | 경계선 |
| `--input` | `oklch(0.18 0 0)` | 입력 필드 경계 |
| `--foreground` | `oklch(0.98 0 0)` | 본문 텍스트 (거의 흰색) |
| `--muted-foreground` | `oklch(0.65 0 0)` | 보조 텍스트 |
| `--primary` | `oklch(0.98 0 0)` | 주요 액션 (흰색 버튼) |
| `--primary-foreground` | `oklch(0.10 0 0)` | 주요 액션 텍스트 |
| `--ring` | `oklch(0.50 0 0)` | 포커스 링 |
| `--destructive` | `oklch(0.65 0.22 25)` | 빨강 유지 |

라이트 모드는 shadcn 기본값 유지.

## 4. 토글 컴포넌트

`features/theme/ui/ThemeToggle.tsx`

- shadcn `DropdownMenu` 사용
- 트리거: 현재 테마에 따라 `Sun` / `Moon` 아이콘 (lucide-react)
- 옵션: Light / Dark / System
- 키보드 접근: 트리거가 `<Button>`이라 자동

## 5. Provider

`features/theme/ui/ThemeProvider.tsx`

```tsx
'use client';
import { ThemeProvider as NextThemes } from 'next-themes';
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
```

루트 `app/layout.tsx`에서 `<html suppressHydrationWarning>` + `<body><ThemeProvider>...`로 감쌈.

## 6. 검증

- 빌드 통과
- 토글 클릭 시 배경이 흰 ↔ 순수 검정으로 즉시 전환되는지 (수동)
- 새로고침 후 이전 선택 유지되는지 (수동)
