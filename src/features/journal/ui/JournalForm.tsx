'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { FileClock, Save } from 'lucide-react';
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
  type Journal,
  type RiskCheck,
  type TradeType,
} from '../model/types';
import { horizonLabel, riskCheckLabel, sentimentLabel } from '../model/labels';
import {
  createJournalAction,
  updateJournalAction,
  uploadJournalImageAction,
  type ActionState,
} from '../api/actions';
import { AiAssist } from './AiAssist';
import { ChipInput } from './ChipInput';
import { MarkdownEditor } from './MarkdownEditor';
import { TradeTypeSelector } from './TradeTypeSelector';
import { EMPTY_TRADE, TradeInfoFields, type TradeState } from './TradeInfoFields';
import { useJournalDraft } from './useJournalDraft';

interface Props {
  initial?: Journal;
  initialTitle?: string;
  initialContent?: string;
  initialTickers?: string[];
  initialTags?: string[];
  imageUploadEnabled?: boolean;
  aiEnabled?: boolean;
}

const SENTIMENT_OPTIONS = [1, 2, 3, 4, 5] as const;
const DRAFT_KEY = 'catch-stock-journal-draft';

interface DraftData {
  title: string;
  content: string;
  tickers: string[];
  tags: string[];
  tradeTypes: TradeType[];
  riskChecks: RiskCheck[];
  horizon: string;
  sentiment: string;
  trade: TradeState;
}

function tradeFromJournal(j?: Journal): TradeState {
  if (!j) return EMPTY_TRADE;
  const s = (v: string | null) => v ?? '';
  return {
    tradeQty: s(j.tradeQty),
    tradePrice: s(j.tradePrice),
    sellPrice: s(j.sellPrice),
    tradeFee: s(j.tradeFee),
    targetReturn: s(j.targetReturn),
    actualReturn: s(j.actualReturn),
  };
}

export function JournalForm({
  initial,
  initialTitle,
  initialContent,
  initialTickers = [],
  initialTags = [],
  imageUploadEnabled = false,
  aiEnabled = false,
}: Props) {
  const locale = useLocale();
  const { t } = locale;
  const isEdit = !!initial;
  // 이미 발행된 일지는 다시 초안으로 되돌리지 않는다.
  const isEditingDraft = initial?.status === 'draft';
  const canSaveDraft = !isEdit || isEditingDraft;
  const action = isEdit ? updateJournalAction.bind(null, initial!.id) : createJournalAction;

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
  const [trade, setTrade] = useState<TradeState>(tradeFromJournal(initial));
  const tradedAt = formatDateTimeInput(initial?.tradedAt ?? new Date(), locale);

  const draftValue = useMemo<DraftData>(
    () => ({ title, content, tickers, tags, tradeTypes, riskChecks, horizon, sentiment, trade }),
    [title, content, tickers, tags, tradeTypes, riskChecks, horizon, sentiment, trade],
  );
  const draft = useJournalDraft<DraftData>(DRAFT_KEY, !isEdit, draftValue);

  const applyDraft = (d: DraftData) => {
    setTitle(d.title ?? '');
    setContent(d.content ?? '');
    setTickers(d.tickers ?? []);
    setTags(d.tags ?? []);
    setTradeTypes(d.tradeTypes ?? []);
    setRiskChecks(d.riskChecks ?? []);
    setHorizon(d.horizon ?? '');
    setSentiment(d.sentiment ?? '');
    setTrade({ ...EMPTY_TRADE, ...d.trade });
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.set('file', file);
    const res = await uploadJournalImageAction(fd);
    if ('error' in res) throw new Error(res.error);
    return res.url;
  };

  return (
    <form
      action={formAction}
      onSubmit={() => {
        if (!isEdit) draft.clear();
      }}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="tickers" value={JSON.stringify(tickers)} />
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <input type="hidden" name="tradeTypes" value={JSON.stringify(tradeTypes)} />
      <input type="hidden" name="riskChecks" value={JSON.stringify(riskChecks)} />
      <input type="hidden" name="locale" value={locale.id} />
      {isEdit && (
        <input type="hidden" name="expectedUpdatedAt" value={initial!.updatedAt.toISOString()} />
      )}

      {draft.pendingDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
          <span>{t('draftFound')}</span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const d = draft.restore();
                if (d) applyDraft(d);
              }}
            >
              {t('draftRestore')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={draft.dismiss}>
              {t('draftDiscard')}
            </Button>
          </div>
        </div>
      )}

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

      <TradeInfoFields value={trade} onChange={setTrade} />

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

      {aiEnabled && (
        <AiAssist
          title={title}
          content={content}
          tickers={tickers}
          tradeTypes={tradeTypes}
          existingTags={tags}
          onApplyDraft={(text) =>
            setContent((current) => (current.trim() ? `${current}\n\n${text}` : text))
          }
          onAddTag={(tag) =>
            setTags((current) =>
              current.includes(tag) ? current : [...current, tag].slice(0, TAG_MAX_COUNT),
            )
          }
        />
      )}

      <div className="space-y-2">
        <Label>{t('bodyMarkdown')}</Label>
        <MarkdownEditor
          name="content"
          value={content}
          onChange={setContent}
          placeholder={t('placeholderJournalBody')}
          imageUploadEnabled={imageUploadEnabled}
          onImageUpload={handleImageUpload}
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
        {canSaveDraft && (
          <Button type="submit" name="status" value="draft" variant="outline" disabled={pending}>
            <FileClock className="mr-2 h-4 w-4" />
            {t('saveDraft')}
          </Button>
        )}
        <Button type="submit" name="status" value="published" disabled={pending}>
          <Save className="mr-2 h-4 w-4" />
          {pending
            ? t('saving')
            : isEditingDraft
              ? t('publishJournal')
              : isEdit
                ? t('updateJournal')
                : t('saveJournal')}
        </Button>
      </div>
    </form>
  );
}
