import { Gasto } from '@prisma/client';

export type TipoGasto = 'fijo' | 'variable';
export type SegmentoGasto = TipoGasto | 'prestamo';

export interface GastoResponse {
  id_gasto: string;
  fecha: string;
  tipo: TipoGasto;
  concepto: string;
  cantidad: number;
  prestamo: boolean;
  pagado: boolean;
}

export interface ConsolidadoMensualResponse {
  mes: string;
  fijo: number;
  variable: number;
  prestamo: number;
  total: number;
}

export interface ConsolidadoAnualResponse {
  anio: string;
  fijo: number;
  variable: number;
  prestamo: number;
  total: number;
}

export function mapGasto(gasto: Gasto): GastoResponse {
  return {
    id_gasto: gasto.idGasto,
    fecha: gasto.fecha.toISOString().slice(0, 10),
    tipo: gasto.tipo as TipoGasto,
    concepto: gasto.concepto,
    cantidad: Number(gasto.cantidad),
    prestamo: gasto.prestamo,
    pagado: gasto.pagado,
  };
}

export function getSegment(gasto: {
  tipo: string;
  prestamo: boolean;
  pagado: boolean;
}): SegmentoGasto {
  if (gasto.prestamo && !gasto.pagado) return 'prestamo';
  return gasto.tipo as TipoGasto;
}

export function parseFecha(fecha: string): Date {
  return new Date(`${fecha}T12:00:00.000Z`);
}

export function todayFecha(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthRange(yyyyMm: string): { start: Date; end: Date } {
  const [year, month] = yyyyMm.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export function emptyConsolidado(): { fijo: number; variable: number; prestamo: number } {
  return { fijo: 0, variable: 0, prestamo: 0 };
}

export function addToConsolidado(
  acc: { fijo: number; variable: number; prestamo: number },
  segment: SegmentoGasto,
  amount: number,
): void {
  acc[segment] += amount;
}

export function withTotal(
  key: string,
  keyField: 'mes' | 'anio',
  acc: { fijo: number; variable: number; prestamo: number },
): ConsolidadoMensualResponse | ConsolidadoAnualResponse {
  const total = acc.fijo + acc.variable + acc.prestamo;
  return { [keyField]: key, ...acc, total } as ConsolidadoMensualResponse &
    ConsolidadoAnualResponse;
}
