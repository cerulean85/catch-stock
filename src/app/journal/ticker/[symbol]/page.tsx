import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { listAllJournals } from '@/features/journal/api/server';
import { TickerTimeline } from '@/features/journal/ui/TickerTimeline';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { symbol } = await params;
  return { title: `${decodeURIComponent(symbol).toUpperCase()} · Catch Stock` };
}

export default async function TickerTimelinePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { symbol } = await params;
  const ticker = decodeURIComponent(symbol).toUpperCase();
  const journals = await listAllJournals(session.user.id, { ticker });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <TickerTimeline symbol={ticker} journals={journals} />
    </div>
  );
}
