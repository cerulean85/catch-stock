import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { riskAssessments, riskCriteria } from '@/shared/db/schema';
import { DEFAULT_RISK_CRITERIA } from '../model/criteria';
import { toRiskLevel } from '../model/parse';
import type { ParsedAssessment } from '../model/parse';
import type { RiskAssessment, RiskSource } from '../model/types';

/** 저장해둔 평가 기준. 아직 손대지 않았으면 기본 초안을 준다. */
export async function getRiskCriteria(userId: string): Promise<string> {
  const rows = await db
    .select({ content: riskCriteria.content })
    .from(riskCriteria)
    .where(eq(riskCriteria.userId, userId))
    .limit(1);
  return rows[0]?.content?.trim() || DEFAULT_RISK_CRITERIA;
}

export async function saveRiskCriteria(userId: string, content: string): Promise<void> {
  await db
    .insert(riskCriteria)
    .values({ userId, content })
    .onConflictDoUpdate({
      target: riskCriteria.userId,
      set: { content, updatedAt: new Date() },
    });
}

/** 이력이 길어져도 패널에 다 그릴 수 없으니 최근 것만 읽는다. */
const HISTORY_LIMIT = 20;

type AssessmentRow = typeof riskAssessments.$inferSelect;

function toAssessment(row: AssessmentRow): RiskAssessment {
  return {
    id: row.id,
    createdAt: row.createdAt,
    level: toRiskLevel(row.level),
    summary: row.summary,
    sections: row.sections.map((section) => ({
      title: section.title,
      level: toRiskLevel(section.level),
      body: section.body,
    })),
    watchlist: row.watchlist,
    sources: row.sources as RiskSource[],
    searched: row.searched,
    model: row.model,
  };
}

/** 한 종목의 평가 이력. 최신순. */
export async function listRiskAssessments(
  userId: string,
  scope: string,
  code: string,
): Promise<RiskAssessment[]> {
  const rows = await db
    .select()
    .from(riskAssessments)
    .where(
      and(
        eq(riskAssessments.userId, userId),
        eq(riskAssessments.scope, scope),
        eq(riskAssessments.code, code),
      ),
    )
    .orderBy(desc(riskAssessments.createdAt))
    .limit(HISTORY_LIMIT);

  return rows.map(toAssessment);
}

export async function saveRiskAssessment(input: {
  userId: string;
  scope: string;
  code: string;
  name: string;
  parsed: ParsedAssessment;
  sources: RiskSource[];
  searched: boolean;
  model: string;
}): Promise<RiskAssessment> {
  const [row] = await db
    .insert(riskAssessments)
    .values({
      userId: input.userId,
      scope: input.scope,
      code: input.code,
      name: input.name,
      level: input.parsed.level,
      summary: input.parsed.summary,
      sections: input.parsed.sections,
      watchlist: input.parsed.watchlist,
      sources: input.sources,
      searched: input.searched,
      model: input.model,
    })
    .returning();

  return toAssessment(row);
}
