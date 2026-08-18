import { notFound, redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import {
  getJournal,
  getTickerTagSuggestions,
  listLinkCandidates,
} from '@/features/journal/api/server';
import { JournalForm, JournalPageHeader } from '@/features/journal';
import { getPrinciple } from '@/features/principles/api/server';
import { getRiskCriteria } from '@/features/risk/api/server';

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

  const [suggestions, linkCandidates, principles, riskCriteria] = await Promise.all([
    getTickerTagSuggestions(session.user.id),
    listLinkCandidates(session.user.id, id),
    getPrinciple(session.user.id),
    getRiskCriteria(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <JournalPageHeader mode="edit" />
      <JournalForm
        initial={journal}
        imageUploadEnabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
        aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
        tickerSuggestions={suggestions.tickers}
        tagSuggestions={suggestions.tags}
        linkCandidates={linkCandidates}
        principles={principles}
        riskCriteria={riskCriteria}
      />
    </div>
  );
}
