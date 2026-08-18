'use client';

import { useState, useTransition } from 'react';
import { ArrowLeft, ChevronRight, ExternalLink, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/locale';
import { formatDateTime } from '@/shared/lib/locale';
import { scanGoldilocksAction } from '../api/actions';
import type { GoldilocksCandidate, GoldilocksScan } from '../model/types';

/** 중기 스윙 골디락스 메모 아래에 붙는 탐색 결과. 탐색은 버튼을 누를 때만 돌린다. */
export function GoldilocksPanel({ initial }: { initial: GoldilocksScan | null }) {
  const locale = useLocale();
  const { t } = locale;
  const [scan, setScan] = useState(initial);
  const [openName, setOpenName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    setOpenName(null);
    startTransition(async () => {
      const result = await scanGoldilocksAction();
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setScan(result.data);
    });
  };

  const open = scan?.candidates.find((item) => item.name === openName) ?? null;

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('goldilocksScanTitle')}
        </h3>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={run}>
          <Radar className={`mr-1.5 h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} />
          {pending ? t('goldilocksScanning') : scan ? t('goldilocksRescan') : t('goldilocksScan')}
        </Button>
      </div>

      {scan && (
        <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
          {t('goldilocksScannedAt')} {formatDateTime(scan.createdAt, locale)}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {pending && <p className="mt-3 text-sm text-muted-foreground">{t('goldilocksWait')}</p>}

      {!pending && !scan && !error && (
        <p className="mt-3 text-sm text-muted-foreground">{t('goldilocksIntro')}</p>
      )}

      {!pending && scan && open && (
        <CandidateDetail candidate={open} onBack={() => setOpenName(null)} />
      )}

      {!pending && scan && !open && (
        <CandidateList scan={scan} onOpen={setOpenName} />
      )}
    </div>
  );
}

function CandidateList({
  scan,
  onOpen,
}: {
  scan: GoldilocksScan;
  onOpen: (name: string) => void;
}) {
  const { t } = useLocale();

  if (scan.candidates.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{scan.note || t('goldilocksEmpty')}</p>;
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <ul className="flex flex-col gap-1.5">
        {scan.candidates.map((candidate) => (
          <li key={candidate.name}>
            <button
              type="button"
              onClick={() => onOpen(candidate.name)}
              className="flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1.5">
                  <span className="truncate text-sm font-medium">{candidate.name}</span>
                  {candidate.code && (
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {candidate.code}
                    </span>
                  )}
                </span>
                {candidate.summary && (
                  <span className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                    {candidate.summary}
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
      {scan.note && <p className="text-[11px] text-muted-foreground">{scan.note}</p>}
      <ScanFooter scan={scan} />
    </div>
  );
}

function CandidateDetail({
  candidate,
  onBack,
}: {
  candidate: GoldilocksCandidate;
  onBack: () => void;
}) {
  const { t } = useLocale();

  const sections = [
    { label: t('goldilocksStory'), body: candidate.story },
    { label: t('goldilocksChart'), body: candidate.chart },
    { label: t('goldilocksSupply'), body: candidate.supply },
    { label: t('goldilocksCatalyst'), body: candidate.catalyst },
    { label: t('goldilocksStopLoss'), body: candidate.stopLoss },
  ].filter((section) => section.body);

  return (
    <div className="mt-3 flex flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('backToList')}
      </button>

      <div className="rounded-md border bg-background p-3">
        <div className="flex items-baseline gap-1.5">
          <h4 className="text-sm font-semibold">{candidate.name}</h4>
          {candidate.code && (
            <span className="font-mono text-[11px] text-muted-foreground">{candidate.code}</span>
          )}
        </div>
        {candidate.summary && (
          <p className="mt-1 text-sm leading-relaxed">{candidate.summary}</p>
        )}
      </div>

      {sections.map((section) => (
        <section key={section.label} className="rounded-md border p-3">
          <h5 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {section.label}
          </h5>
          <p className="mt-1 text-sm leading-relaxed">{section.body}</p>
        </section>
      ))}
    </div>
  );
}

function ScanFooter({ scan }: { scan: GoldilocksScan }) {
  const { t } = useLocale();

  return (
    <>
      {scan.sources.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {scan.sources.slice(0, 8).map((source) => (
            <li key={source.uri}>
              <a
                href={source.uri}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
              >
                {source.title}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {/* 검색을 안 돌렸으면 학습된 지식만으로 답한 것이라 최신 정보가 빠졌을 수 있다. */}
      {!scan.searched && <p className="text-[11px] text-amber-600">{t('riskNoSearch')}</p>}
      <p className="text-[11px] text-muted-foreground">
        {t('riskDisclaimer')} ({scan.model})
      </p>
    </>
  );
}
