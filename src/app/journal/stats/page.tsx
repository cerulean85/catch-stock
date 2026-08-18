import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { getJournalStats, listAllJournals } from '@/features/journal/api/server';
import { JournalStatsView } from '@/features/journal';
import { MistakesCard } from '@/features/journal/ui/MistakesCard';
import { computeMistakes } from '@/features/journal/model/mistakes';
import { QuadrantCard } from '@/features/journal/ui/QuadrantCard';
import { computeQuadrants } from '@/features/journal/model/review';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '투자 일지 통계 · Catch Stock',
};

export default async function JournalStatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [stats, all] = await Promise.all([
    getJournalStats(session.user.id),
    listAllJournals(session.user.id),
  ]);
  const mistakes = computeMistakes(all);
  const quadrants = computeQuadrants(all);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <JournalStatsView stats={stats} />
      <QuadrantCard buckets={quadrants} />
      <MistakesCard mistakes={mistakes} />
    </div>
  );
}
