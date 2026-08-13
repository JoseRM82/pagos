export function formatNumber(value: number): string {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatAxisNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions.toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`;
  }
  if (abs >= 10_000) {
    const thousands = value / 1_000;
    return `${thousands.toLocaleString('es-AR', { maximumFractionDigits: 0 })} mil`;
  }
  return value.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

export function formatCantidad(cantidad: number): string {
  return `$${formatNumber(cantidad)}`;
}

export function formatMonthTotal(total: number): string {
  return `($${formatNumber(total)})`;
}

export function formatPercentChange(
  current: number,
  previous: number,
): string | null {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '-';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

export function normalizeDecimalInput(value: string): string {
  return value.replace(',', '.');
}

export function formatTipo(tipo: string): string {
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

export function formatSiNo(value: boolean): string {
  return value ? 'Sí' : 'No';
}
