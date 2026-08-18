import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { PerformanceView } from '@/features/performance';
import { getPerformance } from '@/features/performance/api/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '매매 성과 · Catch Stock',
};

export default async function PerformancePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const report = await getPerformance(session.user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PerformanceView report={report} />
    </div>
  );
}
