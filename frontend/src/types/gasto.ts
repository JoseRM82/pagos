export type TipoGasto = 'fijo' | 'variable';

export interface Gasto {
  id_gasto: string;
  fecha: string;
  tipo: TipoGasto;
  concepto: string;
  cantidad: number;
  prestamo: boolean;
  pagado: boolean;
}

export interface ConsolidadoMensual {
  mes: string;
  fijo: number;
  variable: number;
  prestamo: number;
  total: number;
}

export interface ConsolidadoAnual {
  anio: string;
  fijo: number;
  variable: number;
  prestamo: number;
  total: number;
}

export type CreateGastoPayload = {
  fecha?: string;
  tipo: TipoGasto;
  concepto?: string;
  cantidad: number;
  prestamo?: boolean;
  pagado?: boolean;
};

export const TIPOS_GASTO: TipoGasto[] = ['fijo', 'variable'];
