'use client';

import Link from 'next/link';
import { useLocale } from '@/features/locale';

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <span>© {new Date().getFullYear()} Catch Stock</span>
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-foreground">
            {t('terms')}
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            {t('privacy')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
