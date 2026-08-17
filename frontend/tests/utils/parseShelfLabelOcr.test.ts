import { describe, expect, it } from 'vitest';
import { parseShelfLabelOcr } from '../../src/utils/parseShelfLabelOcr';

describe('parseShelfLabelOcr', () => {
  it('lee etiqueta argentina con un precio', () => {
    const text = `
      MISKY Mani C/Choc 30 x 70 g
      $ 455,15
      x 30 unidad
      15,17 x und
      55054
      7790580118181
    `;
    expect(parseShelfLabelOcr(text)).toEqual({
      ok: true,
      nombre: 'MISKY Mani C/Choc 30 x 70 g',
      precios: [455.15],
    });
  });

  it('lee etiqueta con dos precios (varejo/atacado)', () => {
    const text = `
      ARROZ TIPO01 CAMIL 5KG FD6
      Varejo
      R$ 12,49
      Atacado
      R$ UN 9,99
      FD C/ 6,00 UN.
      R$ 59,94
    `;
    const result = parseShelfLabelOcr(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nombre).toContain('ARROZ');
      expect(result.precios).toEqual([9.99, 12.49]);
    }
  });

  it('devuelve nombre aunque no haya precios detectados', () => {
    const text = `
      Yerba Mate Premium 1 kg
      codigo interno
    `;
    expect(parseShelfLabelOcr(text)).toEqual({
      ok: true,
      nombre: 'Yerba Mate Premium 1 kg',
      precios: [],
    });
  });

  it('falla si no hay nombre legible', () => {
    expect(parseShelfLabelOcr('7790580118181\n55054')).toEqual({
      ok: false,
      reason: 'no_name',
    });
  });
});
