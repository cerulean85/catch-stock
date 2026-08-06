'use client';

import { useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';

interface SavedView {
  name: string;
  query: string;
}

const STORAGE_KEY = 'catch-stock-journal-views';
const EMPTY: SavedView[] = [];

// localStorage를 외부 스토어로 다뤄 effect 없이 SSR 안전하게 구독한다.
let cache: SavedView[] | null = null;
const listeners = new Set<() => void>();

function readStorage(): SavedView[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getSnapshot(): SavedView[] {
  if (cache === null) cache = readStorage();
  return cache;
}

function writeStorage(next: SavedView[]) {
  cache = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function SavedViews() {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const views = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const saveCurrent = () => {
    const name = window.prompt(t('saveViewPrompt'))?.trim();
    if (!name) return;
    writeStorage([...views.filter((v) => v.name !== name), { name, query: params.toString() }]);
  };

  const apply = (query: string) => {
    router.push(query ? `/journal?${query}` : '/journal');
  };

  const remove = (name: string) => {
    writeStorage(views.filter((v) => v.name !== name));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Bookmark className="h-3.5 w-3.5" />
        {t('savedViews')}:
      </span>
      {views.length === 0 ? (
        <span className="text-xs text-muted-foreground">{t('noSavedViews')}</span>
      ) : (
        views.map((v) => (
          <Badge key={v.name} variant="secondary" className="gap-1 pr-1">
            <button type="button" onClick={() => apply(v.query)} className="select-none">
              {v.name}
            </button>
            <button
              type="button"
              onClick={() => remove(v.name)}
              aria-label={`${v.name} ${t('clear')}`}
              className="rounded-sm hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))
      )}
      <Button type="button" size="sm" variant="ghost" className="h-7" onClick={saveCurrent}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        {t('saveCurrentView')}
      </Button>
    </div>
  );
}
