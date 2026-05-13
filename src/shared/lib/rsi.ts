export const RSI_PERIOD = 14;

export function rsi14(closes: ReadonlyArray<number>): number | null {
  if (closes.length < RSI_PERIOD + 1) return null;

  const deltas = new Array<number>(closes.length - 1);
  for (let i = 1; i < closes.length; i++) {
    deltas[i - 1] = closes[i] - closes[i - 1];
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < RSI_PERIOD; i++) {
    const d = deltas[i];
    if (d >= 0) avgGain += d;
    else avgLoss -= d;
  }
  avgGain /= RSI_PERIOD;
  avgLoss /= RSI_PERIOD;

  for (let i = RSI_PERIOD; i < deltas.length; i++) {
    const d = deltas[i];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (RSI_PERIOD - 1) + gain) / RSI_PERIOD;
    avgLoss = (avgLoss * (RSI_PERIOD - 1) + loss) / RSI_PERIOD;
  }

  if (avgGain === 0 && avgLoss === 0) return 50;
  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
