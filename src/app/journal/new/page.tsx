import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { JournalForm, JournalPageHeader } from '@/features/journal';
import { getTickerTagSuggestions, listLinkCandidates } from '@/features/journal/api/server';
import { TEMPLATES, isTemplateKey } from '@/features/journal/model/templates';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '새 투자 일지 · Catch Stock',
};

interface Props {
  searchParams: Promise<{
    template?: string;
    title?: string;
    content?: string;
    tickers?: string;
    tags?: string;
  }>;
}

export default async function NewJournalPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const sp = await searchParams;
  const initialContent =
    sp.content ?? (isTemplateKey(sp.template) ? TEMPLATES[sp.template] : undefined);
  const initialTickers = parseCsvParam(sp.tickers).map((ticker) => ticker.toUpperCase());
  const initialTags = parseCsvParam(sp.tags);

  const [suggestions, linkCandidates] = await Promise.all([
    getTickerTagSuggestions(session.user.id),
    listLinkCandidates(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <JournalPageHeader mode="new" />
      <JournalForm
        initialContent={initialContent}
        initialTitle={sp.title}
        initialTickers={initialTickers}
        initialTags={initialTags}
        imageUploadEnabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
        aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
        tickerSuggestions={suggestions.tickers}
        tagSuggestions={suggestions.tags}
        linkCandidates={linkCandidates}
      />
    </div>
  );
}

function parseCsvParam(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
