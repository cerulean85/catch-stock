'use server';

import Anthropic from '@anthropic-ai/sdk';
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/model/auth';
import { TAG_MAX_COUNT } from '../model/types';

// 기본 모델은 최신 Opus. 필요 시 JOURNAL_AI_MODEL로 교체(예: claude-sonnet-5).
const MODEL = process.env.JOURNAL_AI_MODEL || 'claude-opus-4-8';

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');
  return userId;
}

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic();
}

export type AiResult<T> = { data: T } | { error: string };

function firstText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === 'text');
  return block && block.type === 'text' ? block.text : '';
}

const AI_DISABLED = 'AI 기능이 설정되지 않았습니다. ANTHROPIC_API_KEY를 설정해주세요.';
const AI_FAILED = 'AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.';

/** 제목·본문·종목을 바탕으로 태그를 제안. */
export async function suggestJournalTagsAction(input: {
  title: string;
  content: string;
  tickers: string[];
}): Promise<AiResult<string[]>> {
  await requireUserId();
  const client = getClient();
  if (!client) return { error: AI_DISABLED };

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system:
        '너는 투자 일지의 태그를 제안하는 도우미다. 제목·종목·본문을 보고 검색과 분류에 유용한 한국어 태그를 5~8개 제안한다. ' +
        '전략(#가치투자 등)·감정(#확신 등)·시장(#상승장 등)·섹터(#반도체 등) 관점을 균형 있게 섞는다. ' +
        '반드시 {"tags": ["#태그", ...]} 형태의 JSON만 출력하고 다른 텍스트는 넣지 않는다.',
      messages: [
        {
          role: 'user',
          content: `제목: ${input.title || '(없음)'}\n종목: ${
            input.tickers.join(', ') || '(없음)'
          }\n본문:\n${input.content || '(없음)'}`,
        },
      ],
    });

    if (message.stop_reason === 'refusal') return { error: AI_FAILED };

    const raw = firstText(message).trim();
    const jsonSlice = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonSlice) as { tags?: unknown };
    const tags = Array.isArray(parsed.tags)
      ? [...new Set(parsed.tags.map((t) => String(t).trim()).filter(Boolean))].slice(
          0,
          TAG_MAX_COUNT,
        )
      : [];
    return { data: tags };
  } catch {
    return { error: AI_FAILED };
  }
}

/** 제목·종목·투자 유형·기존 메모를 바탕으로 본문 초안(마크다운)을 생성. */
export async function draftJournalBodyAction(input: {
  title: string;
  tickers: string[];
  tradeTypes: string[];
  notes: string;
}): Promise<AiResult<string>> {
  await requireUserId();
  const client = getClient();
  if (!client) return { error: AI_DISABLED };

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system:
        '너는 투자 일지 작성을 돕는 도우미다. 사용자가 준 제목·종목·투자 유형·메모를 바탕으로 ' +
        '한국어 마크다운(GFM) 초안을 작성한다. 진입 근거 / 리스크 / 목표·손절 / 다음 점검 항목을 소제목으로 나눠 ' +
        '간결하게 정리한다. 사용자가 적지 않은 수치는 지어내지 말고 빈칸(예: `-`)으로 남긴다. ' +
        '마크다운 본문만 출력하고 코드펜스로 감싸지 않는다.',
      messages: [
        {
          role: 'user',
          content: `제목: ${input.title || '(없음)'}\n종목: ${
            input.tickers.join(', ') || '(없음)'
          }\n투자 유형: ${input.tradeTypes.join(', ') || '(없음)'}\n메모:\n${
            input.notes || '(없음)'
          }`,
        },
      ],
    });

    if (message.stop_reason === 'refusal') return { error: AI_FAILED };
    const text = firstText(message).trim();
    if (!text) return { error: AI_FAILED };
    return { data: text };
  } catch {
    return { error: AI_FAILED };
  }
}
