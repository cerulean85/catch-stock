'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Save } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HORIZONS,
  HORIZON_LABELS,
  SENTIMENT_LABELS,
  TAG_MAX_COUNT,
  TITLE_MAX,
  type Journal,
  type TradeType,
} from '../model/types';
import { createJournalAction, updateJournalAction, type ActionState } from '../api/actions';
import { ChipInput } from './ChipInput';
import { MarkdownEditor } from './MarkdownEditor';
import { TradeTypeSelector } from './TradeTypeSelector';

interface Props {
  initial?: Journal;
  initialContent?: string;
}

function toLocalDateTimeInput(d: Date): string {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

const SENTIMENT_OPTIONS = [1, 2, 3, 4, 5] as const;

export function JournalForm({ initial, initialContent }: Props) {
  const isEdit = !!initial;
  const action = isEdit
    ? updateJournalAction.bind(null, initial!.id)
    : createJournalAction;

  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? initialContent ?? '');
  const [tickers, setTickers] = useState<string[]>(initial?.tickers ?? []);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tradeTypes, setTradeTypes] = useState<TradeType[]>(initial?.tradeTypes ?? []);
  const [horizon, setHorizon] = useState<string>(initial?.horizon ?? '');
  const [sentiment, setSentiment] = useState<string>(
    initial?.sentiment != null ? String(initial.sentiment) : '',
  );
  const [tradedAt] = useState<string>(
    toLocalDateTimeInput(initial?.tradedAt ?? new Date()),
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="tickers" value={JSON.stringify(tickers)} />
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <input type="hidden" name="tradeTypes" value={JSON.stringify(tradeTypes)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            placeholder="예: AAPL 매수 — 진입 근거 정리"
            required
          />
          <p className="text-xs text-muted-foreground">
            {title.length}/{TITLE_MAX}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tradedAt">작성일시</Label>
          <Input
            id="tradedAt"
            name="tradedAt"
            type="datetime-local"
            defaultValue={tradedAt}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>종목 (Ticker)</Label>
          <ChipInput
            values={tickers}
            onChange={setTickers}
            placeholder="예: AAPL, 005930"
            transform={(s) => s.toUpperCase()}
            ariaLabel="종목 입력"
          />
        </div>
        <div className="space-y-2">
          <Label>태그</Label>
          <ChipInput
            values={tags}
            onChange={setTags}
            placeholder="#가치투자, #리스크관리"
            maxCount={TAG_MAX_COUNT}
            ariaLabel="태그 입력"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>투자 유형</Label>
        <TradeTypeSelector values={tradeTypes} onChange={setTradeTypes} />
      </div>

      <fieldset className="grid grid-cols-2 gap-3 rounded-md border p-4 sm:grid-cols-4">
        <legend className="px-1 text-sm font-medium">거래 정보 (선택)</legend>
        <div className="space-y-1.5">
          <Label htmlFor="tradeQty" className="text-xs">수량</Label>
          <Input
            id="tradeQty"
            name="tradeQty"
            type="number"
            step="any"
            defaultValue={initial?.tradeQty ?? ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tradePrice" className="text-xs">단가</Label>
          <Input
            id="tradePrice"
            name="tradePrice"
            type="number"
            step="any"
            defaultValue={initial?.tradePrice ?? ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tradeFee" className="text-xs">수수료</Label>
          <Input
            id="tradeFee"
            name="tradeFee"
            type="number"
            step="any"
            defaultValue={initial?.tradeFee ?? ''}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="targetReturn" className="text-xs">목표 수익률 %</Label>
          <Input
            id="targetReturn"
            name="targetReturn"
            type="number"
            step="any"
            defaultValue={initial?.targetReturn ?? ''}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="actualReturn" className="text-xs">실제 수익률 %</Label>
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
          <Label htmlFor="sentiment">감정 지수</Label>
          <Select
            value={sentiment}
            onValueChange={(v) => setSentiment(v == null || v === 'none' ? '' : v)}
          >
            <SelectTrigger id="sentiment">
              <SelectValue placeholder="선택 안 함" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">선택 안 함</SelectItem>
              {SENTIMENT_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} — {SENTIMENT_LABELS[n]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="sentiment" value={sentiment} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horizon">투자 기간</Label>
          <Select
            value={horizon}
            onValueChange={(v) => setHorizon(v == null || v === 'none' ? '' : v)}
          >
            <SelectTrigger id="horizon">
              <SelectValue placeholder="선택 안 함" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">선택 안 함</SelectItem>
              {HORIZONS.map((h) => (
                <SelectItem key={h} value={h}>
                  {HORIZON_LABELS[h]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="horizon" value={horizon} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>본문 (마크다운)</Label>
        <MarkdownEditor
          name="content"
          value={content}
          onChange={setContent}
          placeholder="이번 거래에 대한 생각을 마크다운으로 정리하세요..."
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
          취소
        </Link>
        <Button type="submit" disabled={pending}>
          <Save className="mr-2 h-4 w-4" />
          {pending ? '저장 중…' : isEdit ? '수정 저장' : '일지 저장'}
        </Button>
      </div>
    </form>
  );
}
