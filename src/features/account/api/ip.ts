import 'server-only';
import { networkInterfaces } from 'node:os';
import { pickLocalIps, type ServerIp } from '../model/ip';

/** 공인 IP는 자주 바뀌지 않으므로 10분간 재사용한다. */
const TTL_MS = 10 * 60 * 1000;

let cached: { value: ServerIp; expiresAt: number } | null = null;

async function fetchPublicIp(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ip?: string };
    return body.ip ?? null;
  } catch {
    return null;
  }
}

/**
 * 이 앱이 외부 API를 호출할 때 상대가 보는 IP. 키움처럼 IP 등록이 필요한 API에서 쓴다.
 * 조회에 실패해도 화면이 깨지지 않도록 null로 떨어뜨린다.
 */
export async function getServerIp(): Promise<ServerIp> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value: ServerIp = {
    publicIp: await fetchPublicIp(),
    localIps: pickLocalIps(networkInterfaces()),
  };
  cached = { value, expiresAt: Date.now() + TTL_MS };
  return value;
}
