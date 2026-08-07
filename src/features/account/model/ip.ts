export interface ServerIp {
  /** 외부에서 보이는 공인 IP. 조회 실패 시 null. */
  publicIp: string | null;
  /** 서버 장비에 붙은 내부 IPv4 주소들. */
  localIps: string[];
}

interface NetAddress {
  address: string;
  family: string | number;
  internal: boolean;
}

/** os.networkInterfaces() 결과에서 외부에 노출되는 IPv4만 추린다(루프백 제외). */
export function pickLocalIps(
  interfaces: Record<string, NetAddress[] | undefined>,
): string[] {
  const found = new Set<string>();
  for (const addresses of Object.values(interfaces)) {
    for (const addr of addresses ?? []) {
      const isV4 = addr.family === 'IPv4' || addr.family === 4;
      if (isV4 && !addr.internal) found.add(addr.address);
    }
  }
  return [...found];
}
