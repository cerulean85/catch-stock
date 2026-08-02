'use client';

import { useEffect, useRef, useState } from 'react';

function hasContent(draft: unknown): boolean {
  if (!draft || typeof draft !== 'object') return false;
  const d = draft as Record<string, unknown>;
  return Boolean(String(d.title ?? '').trim() || String(d.content ?? '').trim());
}

/**
 * 새 일지 작성 폼의 자동 임시저장(localStorage).
 * - 기존 임시저장이 있으면 배너로 복원 여부를 물음(그 전까지 덮어쓰지 않음).
 * - resolve(복원/무시) 이후 500ms 디바운스로 자동 저장.
 * - 저장 성공 시 clear() 호출.
 */
export function useJournalDraft<T>(key: string, enabled: boolean, value: T) {
  // pending != null → 사용자의 복원/무시 결정을 기다리는 상태(그동안 자동 저장 일시 중지).
  const [pending, setPending] = useState<T | null>(null);
  const loaded = useRef(false);
  const resolved = pending == null;

  useEffect(() => {
    if (!enabled || loaded.current) return;
    loaded.current = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as T;
      if (hasContent(parsed)) {
        // 마운트 시 localStorage(외부 시스템)에서 1회 읽어 초기화 — effect가 올바른 위치.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPending(parsed);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      window.localStorage.removeItem(key);
    }
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled || !resolved) return;
    const id = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // 용량 초과 등은 무시
      }
    }, 500);
    return () => clearTimeout(id);
  }, [enabled, resolved, key, value]);

  const clear = () => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  return {
    pendingDraft: pending,
    restore: (): T | null => {
      const d = pending;
      setPending(null);
      return d;
    },
    dismiss: () => {
      clear();
      setPending(null);
    },
    clear,
  };
}
