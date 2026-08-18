'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/features/locale';
import { riskCheckLabel } from '../model/labels';
import type { RiskCheck } from '../model/types';

/** 자유 메모를 줄 단위로 훑어보게만 한다. 편집은 일지 목록에서 한다. */
function NoteLines({ title, text }: { title: string; text: string }) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
  if (lines.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <ul className="mt-1 flex flex-col gap-1">
        {lines.map((line, i) => (
          <li key={`${i}-${line}`} className="flex gap-2 text-sm">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 매수·매도 일지를 발행하기 직전에 뜨는 소프트 게이트.
 * 막지는 않고 마찰만 준다 — 그래도 저장하면 그대로 넘어간다.
 */
export function RiskGateDialog({
  missing,
  principles,
  riskCriteria,
  onCancel,
  onProceed,
}: {
  /** 비어 있지 않으면 열린다. */
  missing: RiskCheck[] | null;
  principles: string;
  riskCriteria: string;
  onCancel: () => void;
  onProceed: () => void;
}) {
  const { t } = useLocale();

  return (
    <Dialog open={missing != null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            {t('gateTitle')}
          </DialogTitle>
          <DialogDescription>{t('gateDescription')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t('gateMissing')} ({missing?.length ?? 0})
            </h3>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {(missing ?? []).map((check) => (
                <li
                  key={check}
                  className="rounded-md border border-amber-500/40 bg-amber-500/5 px-2 py-1 text-sm text-amber-700 dark:text-amber-300"
                >
                  {riskCheckLabel(check, t)}
                </li>
              ))}
            </ul>
          </div>

          <NoteLines title={t('investmentPrinciples')} text={principles} />
          <NoteLines title={t('riskCriteria')} text={riskCriteria} />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('gateGoBack')}
          </Button>
          <Button type="button" variant="secondary" onClick={onProceed}>
            {t('gateProceed')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
