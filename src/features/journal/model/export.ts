import { computeTradeMetrics, effectiveReturn } from './metrics';
import type { Journal } from './types';

function isoMinutes(d: Date): string {
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function round2(n: number | null): string {
  return n == null ? '' : String(Math.round(n * 100) / 100);
}

/** 단일 일지를 Markdown 문서로 직렬화(YAML front-matter + 본문). */
export function journalToMarkdown(journal: Journal): string {
  const { totalCost, pnlAmount, returnPct } = computeTradeMetrics(journal);
  const lines: string[] = ['---'];
  lines.push(`title: ${journal.title}`);
  lines.push(`category: ${journal.category}`);
  lines.push(`tradedAt: ${isoMinutes(journal.tradedAt)}`);
  if (journal.tickers.length) lines.push(`tickers: ${journal.tickers.join(', ')}`);
  if (journal.tags.length) lines.push(`tags: ${journal.tags.join(', ')}`);
  if (journal.tradeTypes.length) lines.push(`tradeTypes: ${journal.tradeTypes.join(', ')}`);
  if (journal.tradeQty != null) lines.push(`tradeQty: ${journal.tradeQty}`);
  if (journal.tradePrice != null) lines.push(`tradePrice: ${journal.tradePrice}`);
  if (journal.sellPrice != null) lines.push(`sellPrice: ${journal.sellPrice}`);
  if (journal.tradeFee != null) lines.push(`tradeFee: ${journal.tradeFee}`);
  if (totalCost != null) lines.push(`totalCost: ${round2(totalCost)}`);
  if (pnlAmount != null) lines.push(`pnlAmount: ${round2(pnlAmount)}`);
  if (returnPct != null) lines.push(`returnPct: ${round2(returnPct)}%`);
  if (journal.sentiment != null) lines.push(`sentiment: ${journal.sentiment}`);
  if (journal.horizon) lines.push(`horizon: ${journal.horizon}`);
  lines.push('---', '', `# ${journal.title}`, '', journal.content, '');
  return lines.join('\n');
}

const CSV_COLUMNS = [
  'id',
  'tradedAt',
  'category',
  'title',
  'tickers',
  'tags',
  'tradeTypes',
  'tradeQty',
  'tradePrice',
  'sellPrice',
  'tradeFee',
  'targetReturn',
  'actualReturn',
  'effectiveReturn',
  'sentiment',
  'horizon',
] as const;

function csvCell(value: string | number | null): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 여러 일지를 CSV 문자열로 직렬화. 스프레드시트/BOM 호환을 위해 CRLF 사용. */
export function journalsToCsv(journals: Journal[]): string {
  const rows = [CSV_COLUMNS.join(',')];
  for (const j of journals) {
    rows.push(
      [
        j.id,
        isoMinutes(j.tradedAt),
        j.category,
        j.title,
        j.tickers.join(' '),
        j.tags.join(' '),
        j.tradeTypes.join(' '),
        j.tradeQty ?? '',
        j.tradePrice ?? '',
        j.sellPrice ?? '',
        j.tradeFee ?? '',
        j.targetReturn ?? '',
        j.actualReturn ?? '',
        round2(effectiveReturn(j)),
        j.sentiment ?? '',
        j.horizon ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return rows.join('\r\n');
}

/** 파일명으로 안전한 slug 생성. */
export function slugifyTitle(title: string, fallback = 'journal'): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}
