import { REGIMES, type RegimeId, type RegimeReading } from '../model/regime';

/**
 * PDF 1번 "지금 어느 국면인가"에 답하는 4분면. 가로축은 고용, 세로축은 물가다.
 * 고용 신호가 엇갈리면 한 칸을 고르지 않고 후보 두 칸을 함께 표시한다.
 * 판정만 크게 띄우면 못 믿으므로 근거 숫자를 아래에 그대로 남긴다.
 */
export function RegimeQuadrant({ reading }: { reading: RegimeReading | null }) {
  if (!reading) {
    return (
      <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
        국면 판정에 필요한 물가·고용 자료를 받지 못했다.
      </p>
    );
  }

  const settled = reading.regime != null;

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">경기 국면</h2>
        <span className={`text-xs ${settled ? 'font-medium' : 'text-muted-foreground'}`}>
          {reading.summary}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr_1fr] gap-2 text-xs">
        <div />
        <div className="text-center text-muted-foreground">고용 개선</div>
        <div className="text-center text-muted-foreground">고용 악화</div>

        {[true, false].map((inflation) => (
          <Row key={String(inflation)} inflation={inflation} reading={reading} settled={settled} />
        ))}
      </div>

      <dl className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
        <div className="flex gap-2">
          <dt className="w-8 shrink-0">물가</dt>
          <dd className="tabular-nums">{reading.inflationDetail}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-8 shrink-0">고용</dt>
          <dd className="space-y-0.5">
            {reading.employmentDetails.map((detail) => (
              <p key={detail} className="tabular-nums">
                {detail}
              </p>
            ))}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** 물가 가속 행이 위, 둔화 행이 아래. 각 행에서 왼쪽이 고용 개선이다. */
const CELLS: { id: RegimeId; inflation: boolean; employment: boolean }[] = [
  { id: 'expansion', inflation: true, employment: true },
  { id: 'slowdown', inflation: true, employment: false },
  { id: 'recovery', inflation: false, employment: true },
  { id: 'recession', inflation: false, employment: false },
];

function Row({
  inflation,
  reading,
  settled,
}: {
  inflation: boolean;
  reading: RegimeReading;
  settled: boolean;
}) {
  return (
    <>
      <div className="flex items-center pr-1 text-muted-foreground">
        {inflation ? '물가 가속' : '물가 둔화'}
      </div>
      {[true, false].map((employment) => {
        const cell = CELLS.find((c) => c.inflation === inflation && c.employment === employment)!;
        const regime = REGIMES[cell.id];
        const active = reading.candidates.includes(cell.id);
        // 단정한 칸은 꽉 채우고, 후보로만 남은 칸은 테두리로 표시한다.
        const tone = !active
          ? 'bg-muted/60 text-muted-foreground ring-1 ring-foreground/10'
          : settled
            ? 'bg-foreground text-background'
            : 'bg-muted text-foreground ring-1 ring-foreground/40';

        return (
          <div key={String(employment)} className={`rounded-lg p-3 ${tone}`}>
            <p className="font-medium">{regime.label}</p>
            <p className={`mt-0.5 text-[11px] ${active && settled ? 'opacity-80' : 'opacity-70'}`}>
              {regime.focus}
            </p>
          </div>
        );
      })}
    </>
  );
}
