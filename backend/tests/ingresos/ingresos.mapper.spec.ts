import {
  addToIngresoConsolidado,
  emptyIngresoConsolidado,
  getIngresoSegment,
} from '../../src/ingresos/ingresos.mapper';

describe('getIngresoSegment', () => {
  it('prestamo va a prestamo aunque no este pagado', () => {
    expect(getIngresoSegment({ prestamo: true })).toBe('prestamo');
  });

  it('no prestamo va a no_prestamo', () => {
    expect(getIngresoSegment({ prestamo: false })).toBe('no_prestamo');
  });
});

describe('consolidado ingreso segmentacion', () => {
  it('acumula montos por segmento', () => {
    const acc = emptyIngresoConsolidado();
    addToIngresoConsolidado(acc, 'no_prestamo', 100);
    addToIngresoConsolidado(acc, 'prestamo', 50);
    expect(acc).toEqual({ no_prestamo: 100, prestamo: 50 });
  });
});
