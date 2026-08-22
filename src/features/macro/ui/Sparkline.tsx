/** 카드 안에 들어가는 작은 추세선. 눈금 없이 방향만 본다. */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 26 - ((value - min) / span) * 22;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const first = values[0]!;
  const last = values[values.length - 1]!;
  // 변화가 없으면 색으로 방향을 말하지 않는다.
  const tone =
    last === first ? 'text-muted-foreground' : last > first ? 'text-emerald-500' : 'text-red-500';

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden
      className={`h-8 w-full ${tone}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
