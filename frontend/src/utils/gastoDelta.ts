import type {
  ConsolidadoAnual,
  ConsolidadoMensual,
  Gasto,
} from '../types/gasto';
import { getSegment } from './normalizeConcepto';

export function monthOf(gasto: Pick<Gasto, 'fecha'>): string {
  return dayOf(gasto.fecha).slice(0, 7);
}

export function dayOf(fecha: string): string {
  return fecha.slice(0, 10);
}

export function normalizeGasto(gasto: Gasto): Gasto {
  return {
    ...gasto,
    fecha: dayOf(gasto.fecha),
    cantidad: Number(gasto.cantidad),
  };
}

export function sameGasto(a: Gasto, b: Gasto): boolean {
  const left = normalizeGasto(a);
  const right = normalizeGasto(b);
  return (
    left.id_gasto === right.id_gasto &&
    left.fecha === right.fecha &&
    left.tipo === right.tipo &&
    left.concepto === right.concepto &&
    left.cantidad === right.cantidad &&
    left.prestamo === right.prestamo &&
    left.pagado === right.pagado
  );
}

export function mesesFromMensual(mensual: ConsolidadoMensual[]): string[] {
  return mensual.map((m) => m.mes).sort();
}

function emptyMonth(mes: string): ConsolidadoMensual {
  return { mes, fijo: 0, variable: 0, prestamo: 0, total: 0 };
}

function isEmptyMonth(row: ConsolidadoMensual): boolean {
  return (
    Math.abs(row.fijo) < 1e-9 &&
    Math.abs(row.variable) < 1e-9 &&
    Math.abs(row.prestamo) < 1e-9
  );
}

function addAmount(
  mensual: ConsolidadoMensual[],
  gasto: Gasto,
  sign: 1 | -1,
): ConsolidadoMensual[] {
  const mes = monthOf(gasto);
  const segment = getSegment(gasto);
  const map = new Map(mensual.map((m) => [m.mes, { ...m }]));
  const row = map.get(mes) ?? emptyMonth(mes);
  row[segment] += sign * Number(gasto.cantidad);
  row.total = row.fijo + row.variable + row.prestamo;
  if (isEmptyMonth(row)) map.delete(mes);
  else map.set(mes, row);
  return [...map.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}

/** Resta `prev` y suma `next` en el consolidado mensual (misma regla que el back). */
export function applyGastoDelta(
  mensual: ConsolidadoMensual[],
  prev: Gasto | null,
  next: Gasto | null,
): ConsolidadoMensual[] {
  let result = mensual;
  if (prev) result = addAmount(result, prev, -1);
  if (next) result = addAmount(result, next, 1);
  return result;
}

function insertByFecha(rows: Gasto[], gasto: Gasto): Gasto[] {
  const item = normalizeGasto(gasto);
  const next = [...rows];
  const idx = next.findIndex((g) => dayOf(g.fecha) > item.fecha);
  if (idx === -1) next.push(item);
  else next.splice(idx, 0, item);
  return next;
}

export function applyRowDelta(
  gastosByMonth: Record<string, Gasto[]>,
  prev: Gasto | null,
  next: Gasto | null,
): Record<string, Gasto[]> {
  const nextMap = { ...gastosByMonth };
  const prevN = prev ? normalizeGasto(prev) : null;
  const nextN = next ? normalizeGasto(next) : null;

  const sameSlot =
    prevN &&
    nextN &&
    prevN.id_gasto === nextN.id_gasto &&
    monthOf(prevN) === monthOf(nextN);

  if (sameSlot && prevN && nextN) {
    const mes = monthOf(nextN);
    const rows = [...(nextMap[mes] ?? [])];
    const idx = rows.findIndex((g) => g.id_gasto === nextN.id_gasto);
    if (idx >= 0) {
      if (prevN.fecha === nextN.fecha) {
        rows[idx] = nextN;
        nextMap[mes] = rows;
        return nextMap;
      }
      rows.splice(idx, 1);
      nextMap[mes] = insertByFecha(rows, nextN);
      return nextMap;
    }
    nextMap[mes] = insertByFecha(rows, nextN);
    return nextMap;
  }

  if (prevN) {
    const mes = monthOf(prevN);
    nextMap[mes] = (nextMap[mes] ?? []).filter(
      (g) => g.id_gasto !== prevN.id_gasto,
    );
  }

  if (nextN) {
    const mes = monthOf(nextN);
    const rows = (nextMap[mes] ?? []).filter(
      (g) => g.id_gasto !== nextN.id_gasto,
    );
    nextMap[mes] = insertByFecha(rows, nextN);
  }

  return nextMap;
}

export function cloneGastosByMonth(
  gastosByMonth: Record<string, Gasto[]>,
): Record<string, Gasto[]> {
  return Object.fromEntries(
    Object.entries(gastosByMonth).map(([mes, rows]) => [mes, [...rows]]),
  );
}

export function buildAnualFromMensual(
  mensual: ConsolidadoMensual[],
): ConsolidadoAnual[] {
  const byYear = new Map<string, ConsolidadoAnual>();
  for (const m of mensual) {
    if (!m.mes) continue;
    const anio = m.mes.slice(0, 4);
    const existing = byYear.get(anio) ?? {
      anio,
      fijo: 0,
      variable: 0,
      prestamo: 0,
      total: 0,
    };
    existing.fijo += m.fijo;
    existing.variable += m.variable;
    existing.prestamo += m.prestamo;
    existing.total += m.total;
    byYear.set(anio, existing);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}
