'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Save } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/features/locale';
import { formatDateTimeInput } from '@/shared/lib/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HORIZONS,
  RISK_CHECKS,
  TAG_MAX_COUNT,
  TITLE_MAX,
  type Horizon,
  type Journal,
  type RiskCheck,
  type TradeType,
} from '../model/types';
import { createJournalAction, updateJournalAction, type ActionState } from '../api/actions';
import { ChipInput } from './ChipInput';
import { MarkdownEditor } from './MarkdownEditor';
import { TradeTypeSelector } from './TradeTypeSelector';

interface Props {
  initial?: Journal;
  initialTitle?: string;
  initialContent?: string;
  initialTickers?: string[];
  initialTags?: string[];
}

const SENTIMENT_OPTIONS = [1, 2, 3, 4, 5] as const;

export function JournalForm({
  initial,
  initialTitle,
  initialContent,
  initialTickers = [],
  initialTags = [],
}: Props) {
  const locale = useLocale();
  const { t } = locale;
  const isEdit = !!initial;
  const action = isEdit
    ? updateJournalAction.bind(null, initial!.id)
    : createJournalAction;

  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  const [title, setTitle] = useState(initial?.title ?? initialTitle ?? '');
  const [content, setContent] = useState(initial?.content ?? initialContent ?? '');
  const [tickers, setTickers] = useState<string[]>(initial?.tickers ?? initialTickers);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? initialTags);
  const [tradeTypes, setTradeTypes] = useState<TradeType[]>(initial?.tradeTypes ?? []);
  const [riskChecks, setRiskChecks] = useState<RiskCheck[]>(initial?.riskChecks ?? []);
  const [horizon, setHorizon] = useState<string>(initial?.horizon ?? '');
  const [sentiment, setSentiment] = useState<string>(
    initial?.sentiment != null ? String(initial.sentiment) : '',
  );
  const tradedAt = formatDateTimeInput(initial?.tradedAt ?? new Date(), locale);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="tickers" value={JSON.stringify(tickers)} />
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <input type="hidden" name="tradeTypes" value={JSON.stringify(tradeTypes)} />
      <input type="hidden" name="riskChecks" value={JSON.stringify(riskChecks)} />
      <input type="hidden" name="locale" value={locale.id} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <Label htmlFor="title">{t('title')}</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            placeholder={t('placeholderJournalTitle')}
            required
          />
          <p className="text-xs text-muted-foreground">
            {title.length}/{TITLE_MAX}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tradedAt">{t('tradedAt')}</Label>
          <Input
            key={locale.id}
            id="tradedAt"
            name="tradedAt"
            type="datetime-local"
            defaultValue={tradedAt}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('ticker')} (Ticker)</Label>
          <ChipInput
            values={tickers}
            onChange={setTickers}
            placeholder="AAPL, 005930"
            transform={(s) => s.toUpperCase()}
            ariaLabel={t('tickerInput')}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('tag')}</Label>
          <ChipInput
            values={tags}
            onChange={setTags}
            placeholder={t('placeholderTags')}
            maxCount={TAG_MAX_COUNT}
            ariaLabel={t('tagInput')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('tradeType')}</Label>
        <TradeTypeSelector values={tradeTypes} onChange={setTradeTypes} />
      </div>

      <fieldset className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-medium">{t('riskChecklist')}</legend>
        {RISK_CHECKS.map((check) => {
          const checked = riskChecks.includes(check);
          return (
            <label
              key={check}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  setRiskChecks((current) =>
                    event.target.checked
                      ? [...current, check]
                      : current.filter((value) => value !== check),
                  );
                }}
              />
              <span>{riskCheckLabel(check, t)}</span>
            </label>
          );
        })}
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3 rounded-md border p-4 sm:grid-cols-4">
        <legend className="px-1 text-sm font-medium">{t('tradeInfoOptional')}</legend>
        <div className="space-y-1.5">
          <Label htmlFor="tradeQty" className="text-xs">{t('tradeQty')}</Label>
          <Input
            id="tradeQty"
            name="tradeQty"
            type="number"
            step="any"
            defaultValue={initial?.tradeQty ?? ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tradePrice" className="text-xs">{t('tradePrice')}</Label>
          <Input
            id="tradePrice"
            name="tradePrice"
            type="number"
            step="any"
            defaultValue={initial?.tradePrice ?? ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tradeFee" className="text-xs">{t('fee')}</Label>
          <Input
            id="tradeFee"
            name="tradeFee"
            type="number"
            step="any"
            defaultValue={initial?.tradeFee ?? ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="targetReturn" className="text-xs">{t('targetReturn')}</Label>
          <Input
            id="targetReturn"
            name="targetReturn"
            type="number"
            step="any"
            defaultValue={initial?.targetReturn ?? ''}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="actualReturn" className="text-xs">{t('actualReturn')}</Label>
          <Input
            id="actualReturn"
            name="actualReturn"
            type="number"
            step="any"
            defaultValue={initial?.actualReturn ?? ''}
          />
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sentiment">{t('sentimentIndex')}</Label>
          <Select
            value={sentiment}
            onValueChange={(v) => setSentiment(v == null || v === 'none' ? '' : v)}
          >
            <SelectTrigger id="sentiment">
              <SelectValue placeholder={t('noSelection')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noSelection')}</SelectItem>
              {SENTIMENT_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} - {sentimentLabel(n, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="sentiment" value={sentiment} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horizon">{t('horizon')}</Label>
          <Select
            value={horizon}
            onValueChange={(v) => setHorizon(v == null || v === 'none' ? '' : v)}
          >
            <SelectTrigger id="horizon">
              <SelectValue placeholder={t('noSelection')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noSelection')}</SelectItem>
              {HORIZONS.map((h) => (
                <SelectItem key={h} value={h}>
                  {horizonLabel(h, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="horizon" value={horizon} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('bodyMarkdown')}</Label>
        <MarkdownEditor
          name="content"
          value={content}
          onChange={setContent}
          placeholder={t('placeholderJournalBody')}
        />
      </div>

      {state?.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href={isEdit ? `/journal/${initial!.id}` : '/journal'}
          className={buttonVariants({ variant: 'ghost' })}
        >
          {t('cancel')}
        </Link>
        <Button type="submit" disabled={pending}>
          <Save className="mr-2 h-4 w-4" />
          {pending ? t('saving') : isEdit ? t('updateJournal') : t('saveJournal')}
        </Button>
      </div>
    </form>
  );
}

function horizonLabel(value: Horizon, t: (key: string) => string): string {
  return t({ short: 'horizonShort', mid: 'horizonMid', long: 'horizonLong' }[value]);
}

function sentimentLabel(value: number, t: (key: string) => string): string {
  const key = {
    1: 'sentimentVeryNegative',
    2: 'sentimentNegative',
    3: 'sentimentNeutral',
    4: 'sentimentPositive',
    5: 'sentimentVeryPositive',
  }[value];
  return key ? t(key) : String(value);
}

function riskCheckLabel(value: RiskCheck, t: (key: string) => string): string {
  return t({
    entryReason: 'riskEntryReason',
    stopLoss: 'riskStopLoss',
    positionSize: 'riskPositionSize',
    earningsDate: 'riskEarningsDate',
    marketDirection: 'riskMarketDirection',
    invalidation: 'riskInvalidation',
  }[value]);
}
