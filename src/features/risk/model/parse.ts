import { RISK_LEVELS, type RiskLevel, type RiskSection } from './types';

const KOREAN_LEVELS: Record<string, RiskLevel> = {
  낮음: 'low',
  보통: 'medium',
  중간: 'medium',
  높음: 'high',
  '매우 높음': 'critical',
  매우높음: 'critical',
};

/** 모델이 영문 키 대신 한국어로 답하는 경우까지 받아준다. 못 읽으면 'medium'. */
export function toRiskLevel(value: unknown): RiskLevel {
  const text = String(value ?? '').trim();
  const lower = text.toLowerCase();
  if ((RISK_LEVELS as readonly string[]).includes(lower)) return lower as RiskLevel;
  return KOREAN_LEVELS[text] ?? 'medium';
}

/** 코드펜스나 앞뒤 설명이 섞여 나와도 JSON 본문만 잘라낸다. */
function extractJson(raw: string): string | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function toSections(value: unknown): RiskSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const row = item as Record<string, unknown>;
    const title = String(row.title ?? '').trim();
    const body = String(row.body ?? '').trim();
    if (!title || !body) return [];
    return [{ title, level: toRiskLevel(row.level), body }];
  });
}

export interface ParsedAssessment {
  level: RiskLevel;
  summary: string;
  sections: RiskSection[];
  watchlist: string[];
}

/** 모델 응답 본문을 평가 결과로 바꾼다. 요약이나 항목이 하나도 없으면 실패로 본다. */
export function parseAssessment(raw: string): ParsedAssessment | null {
  const json = extractJson(raw);
  if (!json) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }

  const summary = String(parsed.summary ?? '').trim();
  const sections = toSections(parsed.sections);
  if (!summary && sections.length === 0) return null;

  return {
    level: toRiskLevel(parsed.level),
    summary,
    sections,
    watchlist: toStringList(parsed.watchlist),
  };
}
