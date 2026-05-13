import { notFound, redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { getJournal } from '@/features/journal/api/server';
import { JournalForm, JournalPageHeader } from '@/features/journal';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '일지 수정 · Catch Stock',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditJournalPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  const journal = await getJournal(session.user.id, id);
  if (!journal) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <JournalPageHeader mode="edit" />
      <JournalForm initial={journal} />
    </div>
  );
}
