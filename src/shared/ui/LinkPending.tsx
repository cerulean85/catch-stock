'use client';

import { useLinkStatus } from 'next/link';
import { Loader2 } from 'lucide-react';

/**
 * 부모 <Link>의 네비게이션 대기 상태를 감지해, 클릭 즉시 스피너 오버레이를 띄운다.
 * 반드시 <Link> 내부에 렌더링해야 하며, 부모 Link에는 `relative`가 필요하다.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-background/60 backdrop-blur-[1px]">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </span>
  );
}
