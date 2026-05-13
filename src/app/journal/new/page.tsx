import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { JournalForm } from '@/features/journal';
import { TEMPLATES, isTemplateKey } from '@/features/journal/model/templates';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '새 투자 일지 · Catch Stock',
};

interface Props {
  searchParams: Promise<{ template?: string }>;
}

export default async function NewJournalPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const sp = await searchParams;
  const initialContent = isTemplateKey(sp.template) ? TEMPLATES[sp.template] : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">새 투자 일지</h1>
        <p className="text-sm text-muted-foreground">
          종목·태그·본문을 기록하세요. 본문은 마크다운(GFM)을 지원합니다.
        </p>
      </header>
      <JournalForm initialContent={initialContent} />
    </div>
  );
}
