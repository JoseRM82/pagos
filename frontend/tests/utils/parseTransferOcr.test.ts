import { describe, expect, it } from 'vitest';
import { completeOcrDate, parseYmd } from '../../src/utils/dateUtils';
import { parseArNumber, parseTransferOcr } from '../../src/utils/parseTransferOcr';

const TODAY = '2026-08-14';

describe('parseArNumber', () => {
  it('entiende formatos AR y US', () => {
    expect(parseArNumber('$15.000')).toBe(15000);
    expect(parseArNumber('15.000,50')).toBe(15000.5);
    expect(parseArNumber('15,000.50')).toBe(15000.5);
    expect(parseArNumber('536.184,00')).toBe(536184);
    expect(parseArNumber('15000.00')).toBe(15000);
  });
});

describe('completeOcrDate', () => {
  it('usa el 15 si solo hay mes/año distinto al actual', () => {
    expect(completeOcrDate({ month: 3, year: 2025 }, TODAY)).toBe('2025-03-15');
  });

  it('usa hoy si el mes/año es el actual', () => {
    expect(completeOcrDate({ month: 8, year: 2026 }, TODAY)).toBe('2026-08-14');
  });

  it('completa el año actual si hay día y mes', () => {
    expect(completeOcrDate({ day: 3, month: 1 }, TODAY)).toBe('2026-01-03');
  });
});

describe('parseTransferOcr', () => {
  it('lee captura tipo Mercado Pago', () => {
    const text = `
      Transferencia enviada
      $15.000
      a Juan Perez
      12 de agosto de 2026
    `;
    expect(parseTransferOcr(text, TODAY)).toEqual({
      ok: true,
      cantidad: 15000,
      fecha: '2026-08-12',
    });
  });

  it('lee importe y fecha numerica de banco', () => {
    const text = `
      Comprobante de transferencia
      Importe: $ 25.430,00
      Fecha: 03/01/2026
      CBU 1234567890123456789012
    `;
    expect(parseTransferOcr(text, TODAY)).toEqual({
      ok: true,
      cantidad: 25430,
      fecha: '2026-01-03',
    });
  });

  it('completa mes y año del mes actual con hoy', () => {
    const text = 'Transferiste $8.000 agosto 2026';
    expect(parseTransferOcr(text, TODAY)).toEqual({
      ok: true,
      cantidad: 8000,
      fecha: '2026-08-14',
    });
  });

  it('completa mes y año de otro mes con el dia 15', () => {
    const text = 'Importe $1.200\n07/2025';
    expect(parseTransferOcr(text, TODAY)).toEqual({
      ok: true,
      cantidad: 1200,
      fecha: '2025-07-15',
    });
  });

  it('completa dia y mes con el año actual', () => {
    const text = 'Monto $500\nFecha 02/03';
    expect(parseTransferOcr(text, TODAY)).toEqual({
      ok: true,
      cantidad: 500,
      fecha: '2026-03-02',
    });
  });

  it('deja fecha en blanco si no hay fecha', () => {
    const text = 'Transferencia enviada\n$9.900';
    expect(parseTransferOcr(text, TODAY)).toEqual({
      ok: true,
      cantidad: 9900,
      fecha: null,
    });
  });

  it('marca ilegible si no hay texto util', () => {
    expect(parseTransferOcr('   ', TODAY)).toEqual({
      ok: false,
      reason: 'unreadable',
    });
    expect(parseTransferOcr('asdf', TODAY)).toEqual({
      ok: false,
      reason: 'unreadable',
    });
  });

  it('marca no transferencia si hay texto pero no monto', () => {
    expect(parseTransferOcr('Comprobante CBU 1234567890123456789012', TODAY)).toEqual({
      ok: false,
      reason: 'not_a_transfer',
    });
  });
});

describe('parseYmd', () => {
  it('rechaza fechas invalidas', () => {
    expect(parseYmd('2026-02-30')).toBeNull();
    expect(parseYmd('2026-08-14')?.day).toBe(14);
  });
});
