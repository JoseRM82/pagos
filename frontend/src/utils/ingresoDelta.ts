import type {
  ConsolidadoIngresoAnual,
  ConsolidadoIngresoMensual,
  Ingreso,
  SegmentoIngreso,
} from '../types/ingreso';
import { getIngresoSegment } from './normalizeConcepto';

export function monthOf(ingreso: Pick<Ingreso, 'fecha'>): string {
  return dayOf(ingreso.fecha).slice(0, 7);
}

export function dayOf(fecha: string): string {
  return fecha.slice(0, 10);
}

export function normalizeIngreso(ingreso: Ingreso): Ingreso {
  return {
    ...ingreso,
    fecha: dayOf(ingreso.fecha),
    cantidad: Number(ingreso.cantidad),
  };
}

export function sameIngreso(a: Ingreso, b: Ingreso): boolean {
  const left = normalizeIngreso(a);
  const right = normalizeIngreso(b);
  return (
    left.id_ingreso === right.id_ingreso &&
    left.fecha === right.fecha &&
    left.concepto === right.concepto &&
    left.cantidad === right.cantidad &&
    left.prestamo === right.prestamo &&
    left.pagado === right.pagado
  );
}

export function mesesFromIngresoMensual(
  mensual: ConsolidadoIngresoMensual[],
): string[] {
  return mensual.map((m) => m.mes).sort();
}

function emptyMonth(mes: string): ConsolidadoIngresoMensual {
  return { mes, no_prestamo: 0, prestamo: 0, total: 0 };
}

function isEmptyMonth(row: ConsolidadoIngresoMensual): boolean {
  return (
    Math.abs(row.no_prestamo) < 1e-9 && Math.abs(row.prestamo) < 1e-9
  );
}

function addAmount(
  mensual: ConsolidadoIngresoMensual[],
  ingreso: Ingreso,
  sign: 1 | -1,
): ConsolidadoIngresoMensual[] {
  const mes = monthOf(ingreso);
  const segment: SegmentoIngreso = getIngresoSegment(ingreso);
  const map = new Map(mensual.map((m) => [m.mes, { ...m }]));
  const row = map.get(mes) ?? emptyMonth(mes);
  row[segment] += sign * Number(ingreso.cantidad);
  row.total = row.no_prestamo + row.prestamo;
  if (isEmptyMonth(row)) map.delete(mes);
  else map.set(mes, row);
  return [...map.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}

export function applyIngresoDelta(
  mensual: ConsolidadoIngresoMensual[],
  prev: Ingreso | null,
  next: Ingreso | null,
): ConsolidadoIngresoMensual[] {
  let result = mensual;
  if (prev) result = addAmount(result, prev, -1);
  if (next) result = addAmount(result, next, 1);
  return result;
}

function insertByFecha(rows: Ingreso[], ingreso: Ingreso): Ingreso[] {
  const item = normalizeIngreso(ingreso);
  const next = [...rows];
  const idx = next.findIndex((g) => dayOf(g.fecha) > item.fecha);
  if (idx === -1) next.push(item);
  else next.splice(idx, 0, item);
  return next;
}

export function applyIngresoRowDelta(
  ingresosByMonth: Record<string, Ingreso[]>,
  prev: Ingreso | null,
  next: Ingreso | null,
): Record<string, Ingreso[]> {
  const nextMap = { ...ingresosByMonth };
  const prevN = prev ? normalizeIngreso(prev) : null;
  const nextN = next ? normalizeIngreso(next) : null;

  const sameSlot =
    prevN &&
    nextN &&
    prevN.id_ingreso === nextN.id_ingreso &&
    monthOf(prevN) === monthOf(nextN);

  if (sameSlot && prevN && nextN) {
    const mes = monthOf(nextN);
    const rows = [...(nextMap[mes] ?? [])];
    const idx = rows.findIndex((g) => g.id_ingreso === nextN.id_ingreso);
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
      (g) => g.id_ingreso !== prevN.id_ingreso,
    );
  }

  if (nextN) {
    const mes = monthOf(nextN);
    const rows = (nextMap[mes] ?? []).filter(
      (g) => g.id_ingreso !== nextN.id_ingreso,
    );
    nextMap[mes] = insertByFecha(rows, nextN);
  }

  return nextMap;
}

export function cloneIngresosByMonth(
  ingresosByMonth: Record<string, Ingreso[]>,
): Record<string, Ingreso[]> {
  return Object.fromEntries(
    Object.entries(ingresosByMonth).map(([mes, rows]) => [mes, [...rows]]),
  );
}

export function buildAnualIngresoFromMensual(
  mensual: ConsolidadoIngresoMensual[],
): ConsolidadoIngresoAnual[] {
  const byYear = new Map<string, ConsolidadoIngresoAnual>();
  for (const m of mensual) {
    if (!m.mes) continue;
    const anio = m.mes.slice(0, 4);
    const existing = byYear.get(anio) ?? {
      anio,
      no_prestamo: 0,
      prestamo: 0,
      total: 0,
    };
    existing.no_prestamo += m.no_prestamo;
    existing.prestamo += m.prestamo;
    existing.total += m.total;
    byYear.set(anio, existing);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}
