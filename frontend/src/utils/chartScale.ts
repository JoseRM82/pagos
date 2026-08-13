function niceStep(range: number, round: boolean): number {
  if (range <= 0) return 1;
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * 10 ** exponent;
}

export function buildYScale(values: number[]) {
  const maxReal = Math.max(...values, 0);
  if (maxReal <= 0) {
    return { maxY: 1, ticks: [0, 1] };
  }

  const padded = maxReal * 1.1;
  const maxY = niceStep(padded, false);
  const step = niceStep(maxY / 5, false);
  const ticks: number[] = [];
  for (let v = 0; v <= maxY + step * 0.001; v += step) {
    ticks.push(v);
  }

  return { maxY: ticks[ticks.length - 1], ticks };
}

export function shortMonthLabel(key: string, mode: 'monthly' | 'annual'): string {
  if (mode === 'annual') return key;
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', {
    month: 'short',
    year: '2-digit',
  });
}

export const SEGMENT_LABELS: Record<string, string> = {
  fijo: 'Fijo',
  variable: 'Variable',
  prestamo: 'Préstamo',
};
