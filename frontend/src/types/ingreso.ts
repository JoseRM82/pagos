export interface Ingreso {
  id_ingreso: string;
  fecha: string;
  concepto: string;
  cantidad: number;
  prestamo: boolean;
  pagado: boolean;
}

export interface ConsolidadoIngresoMensual {
  mes: string;
  no_prestamo: number;
  prestamo: number;
  total: number;
}

export interface ConsolidadoIngresoAnual {
  anio: string;
  no_prestamo: number;
  prestamo: number;
  total: number;
}

export type CreateIngresoPayload = {
  fecha?: string;
  concepto?: string;
  cantidad: number;
  prestamo?: boolean;
  pagado?: boolean;
};

export type SegmentoIngreso = 'no_prestamo' | 'prestamo';
