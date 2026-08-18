'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { askWithSearch, extractJson, geminiModel, isGeminiConfigured } from '@/shared/lib/gemini';
import { buildScanPrompt, EXTRACT_INSTRUCTION, GOLDILOCKS_INSTRUCTION } from '../model/criteria';
import { parseScan } from '../model/parse';
import type { GoldilocksResult } from '../model/types';
import { saveGoldilocksScan } from './server';

const NOT_CONFIGURED = 'Gemini가 설정되지 않았습니다. GEMINI_API_KEY를 확인해주세요.';
const FAILED = '골디락스 종목을 탐색하지 못했습니다. 잠시 후 다시 시도해주세요.';

const TEXT = { type: 'string' } as const;

/** 2단계 출력 구조. 이 스키마가 JSON이 깨지지 않도록 강제한다. */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: TEXT,
          code: TEXT,
          summary: TEXT,
          story: TEXT,
          chart: TEXT,
          supply: TEXT,
          catalyst: TEXT,
          stopLoss: TEXT,
        },
        required: ['name', 'code', 'summary', 'story', 'chart', 'supply', 'catalyst', 'stopLoss'],
        propertyOrdering: [
          'name',
          'code',
          'summary',
          'story',
          'chart',
          'supply',
          'catalyst',
          'stopLoss',
        ],
      },
    },
    note: TEXT,
  },
  required: ['candidates', 'note'],
  propertyOrdering: ['candidates', 'note'],
};

/** GOLDILOCKS.md 기준으로 지금 시장의 골디락스 후보를 찾는다. */
export async function scanGoldilocksAction(): Promise<GoldilocksResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');

  if (!isGeminiConfigured()) return { error: NOT_CONFIGURED };

  // 1단계는 검색해서 근거를 모으고, 2단계는 그 결과를 구조에 맞춰 옮기기만 한다.
  const report = await askWithSearch(
    GOLDILOCKS_INSTRUCTION,
    buildScanPrompt(new Date().toISOString().slice(0, 10)),
  );
  if (!report) return { error: FAILED };

  const structured = await extractJson(EXTRACT_INSTRUCTION, report.text, RESPONSE_SCHEMA);
  if (!structured) return { error: FAILED };

  const parsed = parseScan(structured);
  if (!parsed) return { error: FAILED };

  const saved = await saveGoldilocksScan({
    userId,
    parsed,
    sources: report.sources,
    searched: report.searched,
    model: geminiModel(),
  });

  return { data: saved };
}
