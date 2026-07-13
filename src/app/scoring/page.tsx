import { ScoringView } from '@/features/scoring/ui/ScoringView';

export const metadata = {
  title: '20 투자기준 스코어링 · Catch Stock',
};

export default function ScoringPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <ScoringView />
    </div>
  );
}
