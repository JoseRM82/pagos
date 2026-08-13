import {
  addToConsolidado,
  emptyConsolidado,
  getSegment,
} from '../../src/gastos/gastos.mapper';

describe('getSegment', () => {
  it('prestamo no pagado va a prestamo', () => {
    expect(
      getSegment({ tipo: 'fijo', prestamo: true, pagado: false }),
    ).toBe('prestamo');
  });

  it('prestamo pagado va al tipo correspondiente', () => {
    expect(
      getSegment({ tipo: 'variable', prestamo: true, pagado: true }),
    ).toBe('variable');
  });

  it('no prestamo usa tipo', () => {
    expect(
      getSegment({ tipo: 'fijo', prestamo: false, pagado: false }),
    ).toBe('fijo');
  });
});

describe('consolidado segmentacion', () => {
  it('acumula montos por segmento', () => {
    const acc = emptyConsolidado();
    addToConsolidado(acc, 'fijo', 100);
    addToConsolidado(acc, 'prestamo', 50);
    addToConsolidado(acc, 'variable', 25);
    expect(acc).toEqual({ fijo: 100, variable: 25, prestamo: 50 });
  });
});
