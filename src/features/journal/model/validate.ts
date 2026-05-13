import {
  HORIZONS,
  RISK_CHECKS,
  TAG_MAX_COUNT,
  TITLE_MAX,
  TRADE_TYPES,
  type Horizon,
  type JournalInput,
  type RiskCheck,
  type TradeType,
} from './types';
import { getLocaleOption, parseDateTimeInput } from '@/shared/lib/locale';

export class JournalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JournalValidationError';
  }
}

function asNumberOrNull(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function asTrimmed(value: FormDataEntryValue | null): string {
  return value == null ? '' : String(value).trim();
}

function parseListJSON(raw: FormDataEntryValue | null): string[] {
  if (raw == null) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function parseJournalInput(form: FormData): JournalInput {
  const title = asTrimmed(form.get('title'));
  if (!title) throw new JournalValidationError('제목을 입력해주세요.');
  if (title.length > TITLE_MAX) {
    throw new JournalValidationError(`제목은 ${TITLE_MAX}자 이내로 입력해주세요.`);
  }

  const content = asTrimmed(form.get('content'));
  if (!content) throw new JournalValidationError('본문을 입력해주세요.');

  const tickers = parseListJSON(form.get('tickers'))
    .map((t) => t.toUpperCase())
    .slice(0, 50);
  if (tickers.length === 0) {
    throw new JournalValidationError('하나 이상의 종목을 입력해주세요.');
  }

  const tags = parseListJSON(form.get('tags')).slice(0, TAG_MAX_COUNT);

  const tradeTypesRaw = parseListJSON(form.get('tradeTypes'));
  const tradeTypes = tradeTypesRaw.filter((t): t is TradeType =>
    (TRADE_TYPES as readonly string[]).includes(t),
  );
  const riskChecksRaw = parseListJSON(form.get('riskChecks'));
  const riskChecks = riskChecksRaw.filter((t): t is RiskCheck =>
    (RISK_CHECKS as readonly string[]).includes(t),
  );

  const sentimentN = asNumberOrNull(form.get('sentiment'));
  const sentiment =
    sentimentN != null && sentimentN >= 1 && sentimentN <= 5 ? Math.round(sentimentN) : null;

  const horizonRaw = asTrimmed(form.get('horizon'));
  const horizon = (HORIZONS as readonly string[]).includes(horizonRaw)
    ? (horizonRaw as Horizon)
    : null;

  const tradedAtRaw = asTrimmed(form.get('tradedAt'));
  const locale = getLocaleOption(asTrimmed(form.get('locale')));
  const tradedAt = tradedAtRaw ? parseDateTimeInput(tradedAtRaw, locale) : new Date();
  if (Number.isNaN(tradedAt.getTime())) {
    throw new JournalValidationError('작성일시 형식이 올바르지 않습니다.');
  }

  return {
    title,
    content,
    tickers,
    tags,
    tradeTypes,
    riskChecks,
    tradeQty: asNumberOrNull(form.get('tradeQty')),
    tradePrice: asNumberOrNull(form.get('tradePrice')),
    tradeFee: asNumberOrNull(form.get('tradeFee')),
    sentiment,
    horizon,
    targetReturn: asNumberOrNull(form.get('targetReturn')),
    actualReturn: asNumberOrNull(form.get('actualReturn')),
    tradedAt,
  };
}
