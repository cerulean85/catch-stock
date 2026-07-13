import { SignalsView } from '@/features/signals/ui/SignalsView';

export const metadata = {
  title: '수급왜곡 탐지 신호 · Catch Stock',
};

export default function SignalsPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <SignalsView />
    </div>
  );
}
