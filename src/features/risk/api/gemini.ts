import 'server-only';
import { RISK_LEVELS, type RiskSource } from '../model/types';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.6-flash';
/** 검색까지 도는 1단계는 30초를 넘길 때가 있어 넉넉히 준다. */
const ANALYSIS_TIMEOUT_MS = 90_000;
const EXTRACT_TIMEOUT_MS = 60_000;

const LEVEL_ENUM = [...RISK_LEVELS];

/** 2단계 출력 구조. 이 스키마가 JSON이 깨지지 않도록 강제한다. */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    level: { type: 'string', enum: LEVEL_ENUM },
    summary: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          level: { type: 'string', enum: LEVEL_ENUM },
          body: { type: 'string' },
        },
        required: ['title', 'level', 'body'],
        propertyOrdering: ['title', 'level', 'body'],
      },
    },
    watchlist: { type: 'array', items: { type: 'string' } },
  },
  required: ['level', 'summary', 'sections', 'watchlist'],
  propertyOrdering: ['level', 'summary', 'sections', 'watchlist'],
};

export interface GroundedAnalysis {
  text: string;
  sources: RiskSource[];
  /** 모델이 실제로 웹 검색을 돌렸는지. */
  searched: boolean;
}

interface GroundingChunk {
  web?: { title?: string; uri?: string };
}

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
  groundingMetadata?: {
    webSearchQueries?: string[];
    groundingChunks?: GroundingChunk[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** 중복 출처를 합치고 표시할 수 있는 것만 남긴다. */
function toSources(chunks: GroundingChunk[]): RiskSource[] {
  const seen = new Map<string, RiskSource>();
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.set(uri, { title: chunk.web?.title || uri, uri });
  }
  return [...seen.values()];
}

/** 실패는 예외 대신 null로 돌려 호출부가 사용자에게 보여줄 문구를 정하게 한다. */
async function call(
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<GeminiCandidate | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(`${ENDPOINT}/${geminiModel()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;

    const json = (await response.json()) as GeminiResponse;
    return json.candidates?.[0] ?? null;
  } catch {
    return null;
  }
}

function textOf(candidate: GeminiCandidate | null): string {
  return (candidate?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

/** 1단계: 검색을 붙여 자유 형식 보고서를 받는다. */
export async function analyzeRisk(system: string, prompt: string): Promise<GroundedAnalysis | null> {
  const candidate = await call(
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // 최신 실적·뉴스를 봐야 해서 검색 도구를 붙인다. 쓸지 말지는 모델이 정한다.
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
    },
    ANALYSIS_TIMEOUT_MS,
  );

  const text = textOf(candidate);
  if (!text) return null;

  const grounding = candidate?.groundingMetadata;
  return {
    text,
    sources: toSources(grounding?.groundingChunks ?? []),
    searched: (grounding?.webSearchQueries ?? []).length > 0,
  };
}

/**
 * 2단계: 보고서를 정해진 구조의 JSON으로 옮긴다.
 * 검색 도구와 스키마를 함께 쓰면 검색이 돌지 않아서 단계를 나눴다.
 */
export async function extractAssessment(system: string, analysis: string): Promise<string | null> {
  const candidate = await call(
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: analysis }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8000,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        // 옮겨 적기만 하면 되므로 오래 생각할 필요가 없다.
        thinkingConfig: { thinkingLevel: 'low' },
      },
    },
    EXTRACT_TIMEOUT_MS,
  );

  return textOf(candidate) || null;
}
