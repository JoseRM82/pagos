import { normalizeConcepto } from '../../src/gastos/normalize-concepto';

describe('normalizeConcepto backend', () => {
  it('normaliza igual que frontend', () => {
    expect(normalizeConcepto('café')).toBe('Cafe');
    expect(normalizeConcepto(undefined)).toBe('Gasto');
  });
});
