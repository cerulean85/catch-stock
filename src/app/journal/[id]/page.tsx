import { notFound, redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { getJournal } from '@/features/journal/api/server';
import { JournalDetail } from '@/features/journal';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `일지 ${id.slice(0, 8)} · Catch Stock` };
}

export default async function JournalDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const journal = await getJournal(session.user.id, id);
  if (!journal) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <JournalDetail journal={journal} />
    </div>
  );
}
