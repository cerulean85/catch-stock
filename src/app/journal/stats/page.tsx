import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { getJournalStats } from '@/features/journal/api/server';
import { JournalStatsView } from '@/features/journal';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '투자 일지 통계 · Catch Stock',
};

export default async function JournalStatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const stats = await getJournalStats(session.user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <JournalStatsView stats={stats} />
    </div>
  );
}
