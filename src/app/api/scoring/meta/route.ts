import { ALL_CRITERIA, AREA_LABELS } from '@/features/scoring/model/criteria';
import { PRESETS } from '@/features/scoring/model/presets';
import { DEFAULT_FILTERS } from '@/features/scoring/model/filters';
import type { MetaResponse } from '@/features/scoring/model/types';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const body: MetaResponse = {
    criteria: ALL_CRITERIA.map((c) => ({
      number: c.number,
      key: c.key,
      nameKo: c.nameKo,
      area: c.area,
      areaLabel: AREA_LABELS[c.area],
      status: c.status,
      source: c.source,
      note: c.note,
    })),
    presets: Object.values(PRESETS).map((p) => ({ key: p.key, nameKo: p.nameKo })),
    filters: DEFAULT_FILTERS.map((f) => ({
      key: f.key,
      nameKo: f.nameKo,
      defaultOn: f.defaultOn,
      reason: f.reason,
    })),
  };
  return Response.json(body);
}
