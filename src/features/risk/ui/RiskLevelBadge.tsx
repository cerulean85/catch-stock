'use client';

import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/features/locale';
import type { RiskLevel } from '../model/types';

const TONE: Record<RiskLevel, string> = {
  low: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  medium: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  high: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
  critical: 'border-red-500/40 text-red-600 dark:text-red-400',
};

const LABEL_KEY: Record<RiskLevel, string> = {
  low: 'riskLow',
  medium: 'riskMedium',
  high: 'riskHigh',
  critical: 'riskCritical',
};

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const { t } = useLocale();
  return (
    <Badge variant="outline" className={TONE[level]}>
      {t(LABEL_KEY[level])}
    </Badge>
  );
}
