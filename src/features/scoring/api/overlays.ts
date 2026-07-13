import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import { scoringOverlays } from '@/shared/db/schema';
import type { Overlay } from './build-metrics';

// DB에 유저·종목별로 저장되는 수동 오버레이의 완전한 형태.
export interface StoredOverlay {
  symbol: string;
  moat: number | null;
  tam: number | null;
  governance: number | null;
  geopolitical: number | null;
  institutionalChange: number | null;
  riskTag: string | null;
  updatedAt: string;
}

// 클라이언트/API가 저장을 요청할 때 보내는 부분 입력.
export interface OverlayInput {
  moat?: number | null;
  tam?: number | null;
  governance?: number | null;
  geopolitical?: number | null;
  institutionalChange?: number | null;
  riskTag?: string | null;
}

const SUBSCORE_KEYS = [
  'moat',
  'tam',
  'governance',
  'geopolitical',
  'institutionalChange',
] as const;

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '').slice(0, 16);
}

// 0~5 정수만 허용, 그 외(빈값·범위 밖)는 null로 정규화.
function clampSubscore(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 5) return null;
  return rounded;
}

export async function getUserOverlay(
  userId: string,
  rawSymbol: string,
): Promise<StoredOverlay | null> {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) return null;

  const rows = await db
    .select()
    .from(scoringOverlays)
    .where(and(eq(scoringOverlays.userId, userId), eq(scoringOverlays.symbol, symbol)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    symbol: row.symbol,
    moat: row.moat,
    tam: row.tam,
    governance: row.governance,
    geopolitical: row.geopolitical,
    institutionalChange: row.institutionalChange,
    riskTag: row.riskTag,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function setUserOverlay(
  userId: string,
  rawSymbol: string,
  input: OverlayInput,
): Promise<StoredOverlay> {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) throw new Error('symbol_required');

  const values = {
    userId,
    symbol,
    moat: clampSubscore(input.moat),
    tam: clampSubscore(input.tam),
    governance: clampSubscore(input.governance),
    geopolitical: clampSubscore(input.geopolitical),
    institutionalChange: clampSubscore(input.institutionalChange),
    riskTag: input.riskTag?.trim().slice(0, 200) || null,
  };

  await db
    .insert(scoringOverlays)
    .values(values)
    .onConflictDoUpdate({
      target: [scoringOverlays.userId, scoringOverlays.symbol],
      set: {
        moat: values.moat,
        tam: values.tam,
        governance: values.governance,
        geopolitical: values.geopolitical,
        institutionalChange: values.institutionalChange,
        riskTag: values.riskTag,
        updatedAt: new Date(),
      },
    });

  const saved = await getUserOverlay(userId, symbol);
  if (!saved) throw new Error('overlay_save_failed');
  return saved;
}

export async function clearUserOverlay(userId: string, rawSymbol: string): Promise<void> {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) throw new Error('symbol_required');

  await db
    .delete(scoringOverlays)
    .where(and(eq(scoringOverlays.userId, userId), eq(scoringOverlays.symbol, symbol)));
}

// 저장 오버레이를 엔진이 소비하는 Overlay 형태로 변환.
// null 서브스코어는 키 자체를 생략해 엔진이 중립 3점을 적용하도록 한다.
export function toEngineOverlay(stored: StoredOverlay | null): Overlay {
  const overlay: Overlay = {};
  if (!stored) return overlay;
  for (const key of SUBSCORE_KEYS) {
    const value = stored[key];
    if (value == null) continue;
    if (key === 'institutionalChange') {
      overlay.institutional_change = value;
    } else {
      overlay[key] = value;
    }
  }
  return overlay;
}
