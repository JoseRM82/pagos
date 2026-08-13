import { describe, expect, it } from 'vitest';
import { normalizeConcepto } from '../../src/utils/normalizeConcepto';

describe('normalizeConcepto', () => {
  it('capitaliza y quita tildes', () => {
    expect(normalizeConcepto('  ALQUILER  ')).toBe('Alquiler');
    expect(normalizeConcepto('salida')).toBe('Salida');
    expect(normalizeConcepto('teléfono')).toBe('Telefono');
  });

  it('retorna Gasto si esta vacio', () => {
    expect(normalizeConcepto('')).toBe('Gasto');
    expect(normalizeConcepto('   ')).toBe('Gasto');
    expect(normalizeConcepto(null)).toBe('Gasto');
  });
});
