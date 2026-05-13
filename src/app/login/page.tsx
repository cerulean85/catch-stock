import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LineChart } from 'lucide-react';
import { auth, SignInButton } from '@/features/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '로그인 · Catch Stock',
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/');

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border">
            <LineChart className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Catch Stock</h1>
          <p className="text-sm text-muted-foreground">
            Google 계정으로 로그인하여 시작하세요
          </p>
        </div>
        <SignInButton fullWidth />
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          로그인 시{' '}
          <Link href="/terms" className="underline-offset-4 hover:underline">
            이용약관
          </Link>{' '}
          및{' '}
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            개인정보처리방침
          </Link>
          에 동의한 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
