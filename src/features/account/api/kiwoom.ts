import 'server-only';

/**
 * 키움 REST API 호출 (trade/test.py 기준).
 * 앱키·시크릿키는 서버 환경변수에서만 읽는다. 브라우저로 내려보내지 않는다.
 */

const MOCK_HOST = 'https://mockapi.kiwoom.com';
const LIVE_HOST = 'https://api.kiwoom.com';

/** 토큰 유효기간은 하루 단위지만, 서버 인스턴스 메모리에 1시간만 들고 재발급한다. */
const TOKEN_TTL_MS = 60 * 60 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;

export class KiwoomError extends Error {}

function host(): string {
  return process.env.KIWOOM_MOCK === 'true' ? MOCK_HOST : LIVE_HOST;
}

export function isConfigured(): boolean {
  return Boolean(process.env.KIWOOM_APP_KEY && process.env.KIWOOM_SECRET_KEY);
}

async function issueToken(): Promise<string> {
  const appkey = process.env.KIWOOM_APP_KEY;
  const secretkey = process.env.KIWOOM_SECRET_KEY;
  if (!appkey || !secretkey) {
    throw new KiwoomError('KIWOOM_APP_KEY / KIWOOM_SECRET_KEY가 설정되지 않았습니다.');
  }

  const res = await fetch(`${host()}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ grant_type: 'client_credentials', appkey, secretkey }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new KiwoomError(`토큰 발급 실패 (HTTP ${res.status})`);
  }
  const body = (await res.json()) as { token?: string; access_token?: string };
  const token = body.token ?? body.access_token;
  if (!token) throw new KiwoomError('토큰 발급 응답에 토큰이 없습니다.');
  return token;
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const value = await issueToken();
  cachedToken = { value, expiresAt: Date.now() + TOKEN_TTL_MS };
  return value;
}

async function post(
  endpoint: string,
  apiId: string,
  body: Record<string, string>,
  token: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${host()}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      authorization: `Bearer ${token}`,
      'api-id': apiId,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (res.status === 401) throw new KiwoomError('UNAUTHORIZED');
  if (!res.ok) throw new KiwoomError(`${apiId} 요청 실패 (HTTP ${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

/** 토큰 만료로 401이 나면 캐시를 버리고 한 번만 재시도한다. */
async function request(
  endpoint: string,
  apiId: string,
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  try {
    return await post(endpoint, apiId, body, await getToken());
  } catch (e) {
    if (e instanceof KiwoomError && e.message === 'UNAUTHORIZED') {
      cachedToken = null;
      return post(endpoint, apiId, body, await getToken());
    }
    throw e;
  }
}

/** kt00004 계좌평가현황요청 (국내). */
export function fetchDomesticBalance(): Promise<Record<string, unknown>> {
  return request('/api/dostk/acnt', 'kt00004', { qry_tp: '0', dmst_stex_tp: 'KRX' });
}

/** ust21070 미국주식 잔고확인 (해외). */
export function fetchOverseasBalance(): Promise<Record<string, unknown>> {
  return request('/api/us/acnt', 'ust21070', { stex_tp: '', stk_cd: '' });
}
