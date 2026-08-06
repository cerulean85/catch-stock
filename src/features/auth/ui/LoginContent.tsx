'use client';

import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { useLocale } from '@/features/locale';
import { SignInButton } from './SignInButton';

export function LoginContent() {
  const { t } = useLocale();

  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border">
          <LineChart className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Catch Stock</h1>
        <p className="text-sm text-muted-foreground">{t('loginPrompt')}</p>
      </div>
      <SignInButton fullWidth />
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        {t('loginAgreementPrefix')}{' '}
        <Link href="/terms" className="underline-offset-4 hover:underline">
          {t('terms')}
        </Link>{' '}
        {t('and')}{' '}
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          {t('privacy')}
        </Link>
        {t('loginAgreementSuffix')}
      </p>
    </div>
  );
}
