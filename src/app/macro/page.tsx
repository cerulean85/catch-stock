import { getEconomicCalendar, getMacroBoard } from '@/features/macro/api/server';
import { MacroBoard } from '@/features/macro';

// 지표는 늘 최신을 봐야 한다. 개별 호출은 fetch 단에서 캐시된다.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: '매크로 지표 · Catch Stock',
};

export default async function MacroPage() {
  const [board, calendar] = await Promise.all([getMacroBoard(), getEconomicCalendar()]);
  return <MacroBoard board={board} calendar={calendar} />;
}
