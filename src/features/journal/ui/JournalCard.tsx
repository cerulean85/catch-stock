import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HORIZON_LABELS,
  SENTIMENT_LABELS,
  TRADE_TYPE_LABELS,
  type Journal,
} from '../model/types';

function excerpt(text: string, max = 140): string {
  const flat = text.replace(/[#*>`_~\-\[\]]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export function JournalCard({ journal }: { journal: Journal }) {
  return (
    <Link
      href={`/journal/${journal.id}`}
      className="block transition-colors hover:bg-muted/30"
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="line-clamp-2 text-base sm:text-lg">{journal.title}</CardTitle>
          <p className="text-xs text-muted-foreground tabular-nums">
            {journal.tradedAt.toLocaleString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {excerpt(journal.content) && (
            <p className="line-clamp-3 text-sm text-foreground/80">{excerpt(journal.content)}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {journal.tickers.slice(0, 6).map((t) => (
              <Badge key={t} variant="secondary" className="font-mono text-[11px]">
                {t}
              </Badge>
            ))}
            {journal.tradeTypes.map((t) => (
              <Badge key={t} variant="outline" className="text-[11px]">
                {TRADE_TYPE_LABELS[t]}
              </Badge>
            ))}
          </div>
          {journal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {journal.tags.slice(0, 6).map((tag) => (
                <span key={tag} className="text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {(journal.sentiment != null || journal.horizon) && (
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              {journal.sentiment != null && (
                <span>감정: {SENTIMENT_LABELS[journal.sentiment]}</span>
              )}
              {journal.horizon && <span>기간: {HORIZON_LABELS[journal.horizon]}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
