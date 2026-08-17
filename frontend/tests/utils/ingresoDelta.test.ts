import { describe, expect, it } from 'vitest';
import type { ConsolidadoIngresoMensual, Ingreso } from '../../src/types/ingreso';
import { applyIngresoDelta } from '../../src/utils/ingresoDelta';
import {
  formatHoverCantidad,
  formatPercentChange,
} from '../../src/utils/formatters';

function ingreso(
  partial: Partial<Ingreso> & Pick<Ingreso, 'id_ingreso'>,
): Ingreso {
  return {
    fecha: '2026-08-10',
    concepto: 'Sueldo',
    cantidad: 100,
    prestamo: false,
    pagado: false,
    ...partial,
  };
}

describe('applyIngresoDelta', () => {
  it('suma no prestamo al mes', () => {
    const result = applyIngresoDelta([], null, ingreso({ id_ingreso: '1' }));
    expect(result).toEqual<ConsolidadoIngresoMensual[]>([
      { mes: '2026-08', no_prestamo: 100, prestamo: 0, total: 100 },
    ]);
  });

  it('prestamo va al segmento prestamo aunque pagado', () => {
    const result = applyIngresoDelta(
      [],
      null,
      ingreso({
        id_ingreso: '1',
        prestamo: true,
        pagado: true,
        cantidad: 50,
      }),
    );
    expect(result[0]).toMatchObject({
      prestamo: 50,
      no_prestamo: 0,
      total: 50,
    });
  });
});

describe('formatHoverCantidad', () => {
  it('con anterior 0 muestra signo', () => {
    expect(formatHoverCantidad(450, 0)).toMatch(/^\+\$/);
    expect(formatHoverCantidad(-120, 0)).toMatch(/^-\$/);
  });

  it('con anterior distinto de 0 usa formato normal', () => {
    expect(formatHoverCantidad(450, 100)).toBe(
      formatHoverCantidad(450, null).replace(/^\+/, ''),
    );
  });
});

describe('formatPercentChange', () => {
  it('no muestra pct si anterior es 0', () => {
    expect(formatPercentChange(100, 0)).toBeNull();
  });
});
