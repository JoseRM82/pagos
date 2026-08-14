import { describe, expect, it } from 'vitest';
import { periodsForChart } from '../../src/utils/chartScale';
import { addMonths, addYears } from '../../src/utils/dateUtils';

const CURRENT = '2026-08';

describe('periodsForChart (mensual)', () => {
  it('solo el mes actual si no hay otros con datos en la ventana', () => {
    expect(periodsForChart(['2026-08', '2025-01'], CURRENT, addMonths)).toEqual([
      '2026-08',
    ]);
  });

  it('recorta atras al primer mes con datos dentro de 6', () => {
    expect(
      periodsForChart(
        ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
        CURRENT,
        addMonths,
      ),
    ).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08']);
  });

  it('incluye vacios hasta el sexto atras si ese tiene datos', () => {
    expect(
      periodsForChart(
        ['2026-02', '2026-04', '2026-06', '2026-07', '2026-08'],
        CURRENT,
        addMonths,
      ),
    ).toEqual([
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
    ]);
  });

  it('no considera el septimo mes atras', () => {
    expect(
      periodsForChart(
        ['2026-01', '2026-04', '2026-06', '2026-07', '2026-08'],
        CURRENT,
        addMonths,
      ),
    ).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08']);
  });

  it('incluye vacios hacia adelante hasta el ultimo con datos (max 3)', () => {
    expect(
      periodsForChart(['2026-08', '2026-11'], CURRENT, addMonths),
    ).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
  });

  it('no considera el cuarto mes adelante', () => {
    expect(
      periodsForChart(['2026-08', '2026-12'], CURRENT, addMonths),
    ).toEqual(['2026-08']);
  });

  it('devuelve vacio si no hay datos', () => {
    expect(periodsForChart([], CURRENT, addMonths)).toEqual([]);
  });
});

describe('periodsForChart (anual)', () => {
  it('solo el anio actual si no hay otros en la ventana', () => {
    expect(periodsForChart(['2026', '2018'], '2026', addYears)).toEqual(['2026']);
  });

  it('incluye anios vacios hasta el extremo con datos', () => {
    expect(periodsForChart(['2024', '2026'], '2026', addYears)).toEqual([
      '2024',
      '2025',
      '2026',
    ]);
  });
});
