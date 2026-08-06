/**
 * template은 layout과 달리 네비게이션마다 새로 마운트되므로,
 * 목록↔상세 등 일지 화면 전환 때마다 진입 애니메이션이 재생된다.
 */
export default function JournalTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out">
      {children}
    </div>
  );
}
