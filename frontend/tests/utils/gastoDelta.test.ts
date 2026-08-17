import { describe, expect, it } from 'vitest';
import type { ConsolidadoMensual, Gasto } from '../../src/types/gasto';
import {
  applyGastoDelta,
  applyRowDelta,
  mesesFromMensual,
  monthOf,
} from '../../src/utils/gastoDelta';

function gasto(partial: Partial<Gasto> & Pick<Gasto, 'id_gasto'>): Gasto {
  return {
    fecha: '2026-08-10',
    tipo: 'fijo',
    concepto: 'Alquiler',
    cantidad: 100,
    prestamo: false,
    pagado: true,
    ...partial,
  };
}

describe('applyGastoDelta', () => {
  it('suma un fijo al mes', () => {
    const result = applyGastoDelta([], null, gasto({ id_gasto: '1' }));
    expect(result).toEqual<ConsolidadoMensual[]>([
      { mes: '2026-08', fijo: 100, variable: 0, prestamo: 0, total: 100 },
    ]);
  });

  it('prestamo no pagado va al segmento prestamo', () => {
    const result = applyGastoDelta(
      [],
      null,
      gasto({
        id_gasto: '1',
        prestamo: true,
        pagado: false,
        cantidad: 50,
      }),
    );
    expect(result[0]).toMatchObject({
      prestamo: 50,
      fijo: 0,
      total: 50,
    });
  });

  it('marcar pagado mueve prestamo al tipo', () => {
    const unpaid = gasto({
      id_gasto: '1',
      tipo: 'variable',
      prestamo: true,
      pagado: false,
      cantidad: 80,
    });
    const paid = { ...unpaid, pagado: true };
    const afterAdd = applyGastoDelta([], null, unpaid);
    const afterPay = applyGastoDelta(afterAdd, unpaid, paid);
    expect(afterPay).toEqual([
      { mes: '2026-08', fijo: 0, variable: 80, prestamo: 0, total: 80 },
    ]);
  });

  it('borrar el ultimo gasto saca el mes', () => {
    const row = gasto({ id_gasto: '1' });
    const afterAdd = applyGastoDelta([], null, row);
    expect(applyGastoDelta(afterAdd, row, null)).toEqual([]);
  });

  it('editar cantidad ajusta el total', () => {
    const prev = gasto({ id_gasto: '1', cantidad: 100 });
    const next = { ...prev, cantidad: 130 };
    const afterAdd = applyGastoDelta([], null, prev);
    expect(applyGastoDelta(afterAdd, prev, next)[0].total).toBe(130);
  });

  it('cambiar de mes mueve el monto', () => {
    const prev = gasto({ id_gasto: '1', fecha: '2026-07-20' });
    const next = { ...prev, fecha: '2026-08-02' };
    const afterAdd = applyGastoDelta([], null, prev);
    const moved = applyGastoDelta(afterAdd, prev, next);
    expect(mesesFromMensual(moved)).toEqual(['2026-08']);
    expect(moved[0].total).toBe(100);
  });
});

describe('applyRowDelta', () => {
  it('inserta, reemplaza id y borra', () => {
    const created = gasto({ id_gasto: 'temp-1', fecha: '2026-08-05' });
    const afterInsert = applyRowDelta({}, null, created);
    expect(afterInsert['2026-08']).toHaveLength(1);

    const saved = { ...created, id_gasto: 'real-1' };
    const afterSave = applyRowDelta(afterInsert, created, saved);
    expect(afterSave['2026-08'].map((g) => g.id_gasto)).toEqual(['real-1']);

    const afterDelete = applyRowDelta(afterSave, saved, null);
    expect(afterDelete['2026-08']).toEqual([]);
  });

  it('cambiar pagado no reordena las filas', () => {
    const a = gasto({ id_gasto: 'a', fecha: '2026-08-01', concepto: 'A' });
    const b = gasto({ id_gasto: 'b', fecha: '2026-08-01', concepto: 'B' });
    const c = gasto({ id_gasto: 'c', fecha: '2026-08-15', concepto: 'C' });
    const cache = applyRowDelta({}, null, a);
    const withB = applyRowDelta(cache, null, b);
    const withC = applyRowDelta(withB, null, c);
    expect(withC['2026-08'].map((g) => g.id_gasto)).toEqual(['a', 'b', 'c']);

    const toggled = { ...b, pagado: false };
    const after = applyRowDelta(withC, b, toggled);
    expect(after['2026-08'].map((g) => g.id_gasto)).toEqual(['a', 'b', 'c']);
    expect(after['2026-08'][1].pagado).toBe(false);
  });

  it('cambiar pagado no reordena aunque la fecha venga con hora', () => {
    const a = gasto({ id_gasto: 'a', fecha: '2026-08-01', concepto: 'A' });
    const b = gasto({ id_gasto: 'b', fecha: '2026-08-01', concepto: 'B' });
    const c = gasto({ id_gasto: 'c', fecha: '2026-08-15', concepto: 'C' });
    const cache = applyRowDelta({}, null, a);
    const withB = applyRowDelta(cache, null, b);
    const withC = applyRowDelta(withB, null, c);

    const toggled = {
      ...b,
      pagado: false,
      fecha: '2026-08-01T12:00:00.000Z',
    };
    const after = applyRowDelta(withC, b, toggled);
    expect(after['2026-08'].map((g) => g.id_gasto)).toEqual(['a', 'b', 'c']);
    expect(after['2026-08'][1].pagado).toBe(false);
    expect(after['2026-08'][1].fecha).toBe('2026-08-01');
  });

  it('al cambiar de mes saca la fila del mes anterior', () => {
    const prev = gasto({ id_gasto: '1', fecha: '2026-07-20' });
    const withPrev = applyRowDelta({}, null, prev);
    const next = { ...prev, fecha: '2026-08-02' };
    const moved = applyRowDelta(withPrev, prev, next);
    expect(moved['2026-07']).toEqual([]);
    expect(moved['2026-08']).toEqual([next]);
  });
});

describe('monthOf', () => {
  it('usa YYYY-MM de la fecha', () => {
    expect(monthOf({ fecha: '2026-01-31' })).toBe('2026-01');
  });
});
