import 'server-only';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.6-flash';
/** 검색까지 도는 호출은 30초를 넘길 때가 있어 넉넉히 준다. */
const SEARCH_TIMEOUT_MS = 90_000;
const EXTRACT_TIMEOUT_MS = 60_000;

export interface GeminiSource {
  title: string;
  uri: string;
}

export interface GroundedReply {
  text: string;
  sources: GeminiSource[];
  /** 모델이 실제로 웹 검색을 돌렸는지. 안 돌렸으면 학습된 지식만으로 답한 것이다. */
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

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** 중복 출처를 합치고 표시할 수 있는 것만 남긴다. */
function toSources(chunks: GroundingChunk[]): GeminiSource[] {
  const seen = new Map<string, GeminiSource>();
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

    const json = (await response.json()) as { candidates?: GeminiCandidate[] };
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

/**
 * 1단계: 검색 도구를 붙여 자유 형식 보고서를 받는다.
 * 여기서 JSON을 요구하면 모델이 검색을 건너뛰거나 JSON이 깨져서 형식은 2단계로 미룬다.
 */
export async function askWithSearch(system: string, prompt: string): Promise<GroundedReply | null> {
  const candidate = await call(
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
    },
    SEARCH_TIMEOUT_MS,
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

/** 2단계: 1단계 보고서를 정해진 스키마의 JSON으로 옮긴다. 검색은 쓰지 않는다. */
export async function extractJson(
  system: string,
  input: string,
  schema: Record<string, unknown>,
): Promise<string | null> {
  const candidate = await call(
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: input }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8000,
        responseMimeType: 'application/json',
        responseSchema: schema,
        // 옮겨 적기만 하면 되므로 오래 생각할 필요가 없다.
        thinkingConfig: { thinkingLevel: 'low' },
      },
    },
    EXTRACT_TIMEOUT_MS,
  );

  return textOf(candidate) || null;
}
