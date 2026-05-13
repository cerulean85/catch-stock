import type { LiquidityPoint } from './types';

export function parseFredCsv(csv: string, scale: number): LiquidityPoint[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [date, rawValue] = line.split(',');
      if (!rawValue) return null;
      const value = Number(rawValue);
      if (!date || !Number.isFinite(value)) return null;
      return { date, value: Math.round(value * scale * 100) / 100 };
    })
    .filter((point): point is LiquidityPoint => point !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}
