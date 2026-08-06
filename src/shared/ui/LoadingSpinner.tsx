import { Loader2 } from 'lucide-react';

/** 페이지 전환·데이터 로딩 중 보여주는 공용 인디케이터. */
export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`flex min-h-[50vh] items-center justify-center ${className}`}
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
