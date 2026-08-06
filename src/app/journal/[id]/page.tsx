import { notFound, redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { getJournal, listJournals } from '@/features/journal/api/server';
import { JournalBackButton, JournalDetail, JournalSidebarList } from '@/features/journal';

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

  const [linked, list] = await Promise.all([
    journal.linkedJournalId
      ? getJournal(session.user.id, journal.linkedJournalId)
      : Promise.resolve(null),
    listJournals(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:h-[calc(100vh-3.5rem)] lg:py-6">
      <div className="grid grid-cols-1 gap-6 lg:h-full lg:grid-cols-[1fr_minmax(0,20rem)] lg:gap-8 lg:overflow-hidden">
        {/* 좌측: 일지 본문 — 독립 스크롤 */}
        <section className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-4">
          <JournalBackButton />
          <JournalDetail journal={journal} linked={linked} />
        </section>
        {/* 우측: 일지 목록 — muted 패널, 독립 스크롤 */}
        <aside className="rounded-xl border bg-muted/40 p-4 lg:min-h-0 lg:overflow-y-auto lg:p-5">
          <JournalSidebarList items={list.items} currentId={journal.id} />
        </aside>
      </div>
    </div>
  );
}
