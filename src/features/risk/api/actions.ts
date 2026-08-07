'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { db } from '@/shared/db/client';
import { accountHoldings } from '@/shared/db/schema';
import { toNumber } from '@/features/account/model/group';
import type { Holding } from '@/features/account';
import { normalizeCriteria, validateCriteria } from '../model/criteria';
import { parseAssessment } from '../model/parse';
import { ANALYSIS_INSTRUCTION, buildRiskPrompt, EXTRACT_INSTRUCTION } from '../model/prompt';
import type { RiskAssessment, RiskResult } from '../model/types';
import { analyzeRisk, extractAssessment, geminiModel, isGeminiConfigured } from './gemini';
import {
  getRiskCriteria,
  listRiskAssessments,
  saveRiskAssessment,
  saveRiskCriteria,
} from './server';

const NOT_CONFIGURED = 'Gemini가 설정되지 않았습니다. GEMINI_API_KEY를 확인해주세요.';
const NOT_FOUND = '보유 종목을 찾지 못했습니다. 잔고를 새로고침해주세요.';
const FAILED = '리스크 평가를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.';

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');
  return userId;
}

/** 클라이언트가 보낸 숫자를 믿지 않고 잔고 스냅샷에서 다시 읽는다. */
async function findHolding(scope: string, code: string): Promise<Holding | null> {
  const rows = await db
    .select()
    .from(accountHoldings)
    .where(and(eq(accountHoldings.scope, scope), eq(accountHoldings.code, code)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    scope: row.scope === 'overseas' ? 'overseas' : 'domestic',
    code: row.code,
    name: row.name,
    quantity: toNumber(row.quantity),
    avgPrice: toNumber(row.avgPrice),
    currentPrice: toNumber(row.currentPrice),
    evalAmount: toNumber(row.evalAmount),
    pnlAmount: toNumber(row.pnlAmount),
    pnlRate: toNumber(row.pnlRate),
    currency: row.currency,
    evalAmountKrw: row.evalAmountKrw == null ? null : toNumber(row.evalAmountKrw),
  };
}

/** 종목 하나를 사용자의 평가 기준으로 평가한다. */
export async function evaluateRiskAction(scope: string, code: string): Promise<RiskResult> {
  const userId = await requireUserId();
  if (!isGeminiConfigured()) return { error: NOT_CONFIGURED };

  const [holding, criteria] = await Promise.all([
    findHolding(scope, code),
    getRiskCriteria(userId),
  ]);
  if (!holding) return { error: NOT_FOUND };

  const prompt = buildRiskPrompt({
    holding,
    criteria,
    today: new Date().toISOString().slice(0, 10),
  });

  // 1단계는 검색해서 근거를 모으고, 2단계는 그 결과를 구조에 맞춰 옮기기만 한다.
  const analysis = await analyzeRisk(ANALYSIS_INSTRUCTION, prompt);
  if (!analysis) return { error: FAILED };

  const structured = await extractAssessment(EXTRACT_INSTRUCTION, analysis.text);
  if (!structured) return { error: FAILED };

  const parsed = parseAssessment(structured);
  if (!parsed) return { error: FAILED };

  const saved = await saveRiskAssessment({
    userId,
    scope: holding.scope,
    code: holding.code,
    name: holding.name,
    parsed,
    sources: analysis.sources,
    searched: analysis.searched,
    model: geminiModel(),
  });

  return { data: saved };
}

export type CriteriaActionState = { error: string } | null;

export async function saveRiskCriteriaAction(content: string): Promise<CriteriaActionState> {
  const userId = await requireUserId();

  const normalized = normalizeCriteria(content);
  const error = validateCriteria(normalized);
  if (error) return { error };

  await saveRiskCriteria(userId, normalized);
  return null;
}

/** 한 종목의 과거 평가 이력. 리스크 탭을 열 때 읽는다. */
export async function listRiskAssessmentsAction(
  scope: string,
  code: string,
): Promise<RiskAssessment[]> {
  const userId = await requireUserId();
  return listRiskAssessments(userId, scope, code);
}
