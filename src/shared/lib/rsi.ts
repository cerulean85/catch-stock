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

/**
 * Calculate all RSI14 values for a series of closes.
 * Returns array of RSI values (first RSI_PERIOD values are null).
 */
export function rsi14Array(closes: ReadonlyArray<number>): (number | null)[] {
  if (closes.length < RSI_PERIOD + 1) {
    return new Array(closes.length).fill(null);
  }

  const rsiValues = new Array<number | null>(closes.length).fill(null);

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

  if (avgGain === 0 && avgLoss === 0) {
    rsiValues[RSI_PERIOD] = 50;
  } else if (avgLoss === 0) {
    rsiValues[RSI_PERIOD] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsiValues[RSI_PERIOD] = 100 - 100 / (1 + rs);
  }

  for (let i = RSI_PERIOD; i < deltas.length; i++) {
    const d = deltas[i];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (RSI_PERIOD - 1) + gain) / RSI_PERIOD;
    avgLoss = (avgLoss * (RSI_PERIOD - 1) + loss) / RSI_PERIOD;

    if (avgGain === 0 && avgLoss === 0) {
      rsiValues[i + 1] = 50;
    } else if (avgLoss === 0) {
      rsiValues[i + 1] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsiValues[i + 1] = 100 - 100 / (1 + rs);
    }
  }

  return rsiValues;
}
