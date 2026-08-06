'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTyping(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  return EDITABLE.has(node.tagName) || node.isContentEditable;
}

/**
 * 일지 목록 화면 전역 단축키.
 * - n: 새 일지, s: 통계, /: 검색 포커스
 */
export function JournalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        if (isTyping(e.target)) return;
        const search = document.getElementById('journal-search') as HTMLInputElement | null;
        if (search) {
          e.preventDefault();
          search.focus();
        }
        return;
      }

      if (isTyping(e.target)) return;
      if (e.key === 'n') {
        e.preventDefault();
        router.push('/journal/new');
      } else if (e.key === 's') {
        e.preventDefault();
        router.push('/journal/stats');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return null;
}
