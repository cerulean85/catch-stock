import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  HORIZON_LABELS,
  SENTIMENT_LABELS,
  TRADE_TYPE_LABELS,
  type Journal,
} from '../model/types';
import { DeleteJournalButton } from './DeleteJournalButton';
import { MarkdownPreview } from './MarkdownPreview';

function formatNumber(s: string | null): string | null {
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n.toLocaleString() : s;
}

export function JournalDetail({ journal }: { journal: Journal }) {
  const trade = {
    qty: formatNumber(journal.tradeQty),
    price: formatNumber(journal.tradePrice),
    fee: formatNumber(journal.tradeFee),
    target: formatNumber(journal.targetReturn),
    actual: formatNumber(journal.actualReturn),
  };
  const hasTrade =
    trade.qty != null ||
    trade.price != null ||
    trade.fee != null ||
    trade.target != null ||
    trade.actual != null;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{journal.title}</h1>
          <div className="flex items-center gap-2">
            <Link
              href={`/journal/${journal.id}/edit`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <Pencil className="mr-2 h-4 w-4" /> 수정
            </Link>
            <DeleteJournalButton id={journal.id} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {journal.tradedAt.toLocaleString()}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {journal.tickers.map((t) => (
            <Badge key={t} variant="secondary" className="font-mono">
              {t}
            </Badge>
          ))}
          {journal.tradeTypes.map((t) => (
            <Badge key={t} variant="outline">
              {TRADE_TYPE_LABELS[t]}
            </Badge>
          ))}
          {journal.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>
        {(journal.sentiment != null || journal.horizon) && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {journal.sentiment != null && (
              <span>감정: {SENTIMENT_LABELS[journal.sentiment]}</span>
            )}
            {journal.horizon && <span>기간: {HORIZON_LABELS[journal.horizon]}</span>}
          </div>
        )}
      </header>

      {hasTrade && (
        <section className="grid grid-cols-2 gap-3 rounded-md border bg-card p-4 sm:grid-cols-5">
          <Cell label="수량" value={trade.qty} />
          <Cell label="단가" value={trade.price} />
          <Cell label="수수료" value={trade.fee} />
          <Cell label="목표 %" value={trade.target} />
          <Cell label="실제 %" value={trade.actual} />
        </section>
      )}

      <Separator />

      <MarkdownPreview content={journal.content} />
    </article>
  );
}

function Cell({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums">{value ?? '—'}</span>
    </div>
  );
}
