import { ExternalLink } from 'lucide-react';
import { periodLabel, readFreshness } from '../model/freshness';
import { MACRO_DERIVED } from '../model/derived';
import { MACRO_METRICS } from '../model/metrics';
import type { MacroReading } from '../model/board';
import { FREQUENCY_LABEL, formatChange, formatValue } from './format';
import { sourceLink, tradingEconomicsLink } from './links';
import { Sparkline } from './Sparkline';

/**
 * 지표 하나. 숫자만 두면 해석이 안 되므로 카탈로그의 판정 기준(watch)을 같이 붙인다.
 * 임계값은 문장으로만 적혀 있어 색으로 자동 판정하지 않는다 — 판단은 사람이 한다.
 */
/** linkedTo에는 id가 들어 있다. 화면에는 id 대신 사람이 읽는 이름을 보여준다. 파생 지표도 가리킬 수 있다. */
const LABEL_BY_ID = new Map(
  [...MACRO_METRICS, ...MACRO_DERIVED].map((item) => [item.id, item.label]),
);

export function MetricCard({
  reading,
  today,
  nextRelease,
}: {
  reading: MacroReading;
  today: Date;
  /** 이 지표가 다음에 갱신되는 날. 월간·분기 카드가 밀린 게 아님을 알려 준다. */
  nextRelease?: string;
}) {
  const { metric, value, change, asOf, history, note, error } = reading;
  const freshness = asOf ? readFreshness(asOf, metric.frequency, today) : null;
  const periodic = metric.frequency === 'M' || metric.frequency === 'Q';
  // 월간·분기는 기간 이름으로 적고, 며칠 지났는지는 오해를 부르므로 쓰지 않는다.
  const when = asOf ? (periodic ? periodLabel(asOf, metric.frequency) : asOf) : null;
  const meta = [when, periodic ? null : freshness?.label, note].filter(Boolean).join(' · ');
  const source = sourceLink(metric);
  const explainer = tradingEconomicsLink(metric);

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-2">
        <h3 className="leading-tight font-medium">{metric.label}</h3>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {FREQUENCY_LABEL[metric.frequency]}
        </span>
      </div>

      {value != null && (
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tabular-nums">
            {formatValue(value, metric.unit)}
          </span>
          {change != null && change !== 0 && (
            <span
              className={`text-xs font-medium tabular-nums ${
                change > 0 ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {formatChange(change, metric.unit)}
            </span>
          )}
        </div>
      )}

      {history.length > 1 && <Sparkline values={history} />}

      {error && <p className="text-xs text-destructive">받지 못함 · {error}</p>}

      {meta && (
        <p
          className={`text-[11px] tabular-nums ${
            !periodic && freshness?.stale ? 'text-amber-500' : 'text-muted-foreground'
          }`}
        >
          {meta}
        </p>
      )}

      {nextRelease && (
        <p className="text-[11px] text-muted-foreground tabular-nums">다음 발표 {nextRelease}</p>
      )}

      <p className="mt-auto border-t pt-2 text-xs leading-relaxed text-muted-foreground">
        {metric.watch}
      </p>

      {(source || explainer) && (
        <p className="flex flex-wrap items-center gap-2 text-[11px]">
          {[source, explainer].filter(Boolean).map((link) => (
            <a
              key={link!.href}
              href={link!.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              {link!.label}
              <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </p>
      )}

      {metric.linkedTo.length > 0 && (
        <p className="text-[11px] text-muted-foreground/70">
          같이 볼 지표 · {metric.linkedTo.map((id) => LABEL_BY_ID.get(id) ?? id).join(', ')}
        </p>
      )}
    </div>
  );
}
