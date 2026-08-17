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

/** Cuando el periodo anterior es 0: muestra signo (+/-) sin %. */
export function formatCantidadSigned(cantidad: number): string {
  const sign = cantidad >= 0 ? '+' : '-';
  return `${sign}$${formatNumber(Math.abs(cantidad))}`;
}

export function formatHoverCantidad(
  current: number,
  previous: number | null,
): string {
  if (previous === 0) return formatCantidadSigned(current);
  return formatCantidad(current);
}

export function formatMonthTotal(total: number): string {
  return `($${formatNumber(total)})`;
}

export function formatPercentChange(
  current: number,
  previous: number,
): string | null {
  if (previous === 0) return null;
  // Con valores netos que cambian de signo (p. ej. pérdida → ganancia), usar
  // |previous| evita que una mejora se muestre como porcentaje negativo.
  const pct = ((current - previous) / Math.abs(previous)) * 100;
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
