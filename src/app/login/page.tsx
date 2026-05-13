import { redirect } from 'next/navigation';
import { auth, LoginContent } from '@/features/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '로그인 · Catch Stock',
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/');

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-10">
      <LoginContent />
    </div>
  );
}
