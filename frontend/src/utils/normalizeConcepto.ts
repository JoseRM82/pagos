export function normalizeConcepto(
  text: string | undefined | null,
  fallback = 'Gasto',
): string {
  if (text === undefined || text === null) return fallback;
  const collapsed = text.trim().replace(/\s+/g, ' ');
  if (!collapsed) return fallback;
  const withoutAccents = collapsed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const lower = withoutAccents.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function getSegment(gasto: {
  tipo: string;
  prestamo: boolean;
  pagado: boolean;
}): 'fijo' | 'variable' | 'prestamo' {
  if (gasto.prestamo && !gasto.pagado) return 'prestamo';
  return gasto.tipo as 'fijo' | 'variable';
}

/** En ingresos el color solo depende de préstamo; pagado no mueve el segmento. */
export function getIngresoSegment(ingreso: {
  prestamo: boolean;
}): 'no_prestamo' | 'prestamo' {
  return ingreso.prestamo ? 'prestamo' : 'no_prestamo';
}
