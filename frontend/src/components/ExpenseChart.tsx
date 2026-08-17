import { useEffect, useRef } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ConsolidadoAnual, ConsolidadoMensual } from '../types/gasto';
import type {
  ConsolidadoIngresoAnual,
  ConsolidadoIngresoMensual,
} from '../types/ingreso';
import { addMonths, addYears, getCurrentMonth, getCurrentYear } from '../utils/dateUtils';
import {
  buildYScale,
  periodsForChart,
  SEGMENT_LABELS,
  shortMonthLabel,
} from '../utils/chartScale';
import {
  formatAxisNumber,
  formatHoverCantidad,
  formatPercentChange,
} from '../utils/formatters';

export type ChartMode = 'monthly' | 'annual';
export type ChartVariant = 'gastos' | 'ingresos' | 'combined';

type GastoSegmentKey = 'fijo' | 'variable' | 'prestamo';

interface ChartPoint {
  key: string;
  label: string;
  fijo: number;
  variable: number;
  prestamo: number;
  gastoTotal: number;
  no_prestamo: number;
  ingresoPrestamo: number;
  ingresoTotal: number;
  net: number;
  air: number;
  airGastos: number;
  airIngresos: number;
}

interface Props {
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  variant?: ChartVariant;
  mensual?: ConsolidadoMensual[];
  anual?: ConsolidadoAnual[];
  mensualIngresos?: ConsolidadoIngresoMensual[];
  anualIngresos?: ConsolidadoIngresoAnual[];
}

const GASTO_SEGMENTS: { key: GastoSegmentKey; color: string; label: string }[] =
  [
    { key: 'fijo', color: 'var(--gasto-purple)', label: 'Fijo' },
    { key: 'variable', color: 'var(--gasto-blue)', label: 'Variable' },
    { key: 'prestamo', color: 'var(--gasto-black)', label: 'Préstamo' },
  ];

const INGRESO_SEGMENTS: {
  key: 'no_prestamo' | 'ingresoPrestamo';
  color: string;
  labelCombined: string;
  labelSolo: string;
}[] = [
  {
    key: 'no_prestamo',
    color: 'var(--ingreso-celeste)',
    labelCombined: 'Ingreso',
    labelSolo: 'No préstamo',
  },
  {
    key: 'ingresoPrestamo',
    color: 'var(--ingreso-amarillo)',
    labelCombined: 'Ingreso préstamo',
    labelSolo: 'Préstamo',
  },
];

function emptyGasto() {
  return { fijo: 0, variable: 0, prestamo: 0, total: 0 };
}

function emptyIngreso() {
  return { no_prestamo: 0, prestamo: 0, total: 0 };
}

function toPoint(
  key: string,
  label: string,
  gasto?: { fijo: number; variable: number; prestamo: number; total: number },
  ingreso?: { no_prestamo: number; prestamo: number; total: number },
): ChartPoint {
  const g = gasto ?? emptyGasto();
  const i = ingreso ?? emptyIngreso();
  const gastoTotal = g.total ?? g.fijo + g.variable + g.prestamo;
  const ingresoTotal = i.total ?? i.no_prestamo + i.prestamo;
  return {
    key,
    label,
    fijo: g.fijo,
    variable: g.variable,
    prestamo: g.prestamo,
    gastoTotal,
    no_prestamo: i.no_prestamo,
    ingresoPrestamo: i.prestamo,
    ingresoTotal,
    net: ingresoTotal - gastoTotal,
    air: 0,
    airGastos: 0,
    airIngresos: 0,
  };
}

function buildPoints(
  mode: ChartMode,
  variant: ChartVariant,
  mensual: ConsolidadoMensual[],
  anual: ConsolidadoAnual[],
  mensualIngresos: ConsolidadoIngresoMensual[],
  anualIngresos: ConsolidadoIngresoAnual[],
): ChartPoint[] {
  if (mode === 'annual') {
    const gastoMap = new Map(anual.map((a) => [a.anio, a]));
    const ingresoMap = new Map(anualIngresos.map((a) => [a.anio, a]));
    const keys =
      variant === 'gastos'
        ? anual.map((a) => a.anio)
        : variant === 'ingresos'
          ? anualIngresos.map((a) => a.anio)
          : [
              ...new Set([
                ...anual.map((a) => a.anio),
                ...anualIngresos.map((a) => a.anio),
              ]),
            ];
    const years = periodsForChart(keys, getCurrentYear(), addYears);
    return years.map((anio) =>
      toPoint(anio, anio, gastoMap.get(anio), ingresoMap.get(anio)),
    );
  }

  const gastoMap = new Map(
    mensual.filter((m) => m.mes).map((m) => [m.mes, m]),
  );
  const ingresoMap = new Map(
    mensualIngresos.filter((m) => m.mes).map((m) => [m.mes, m]),
  );
  const keys =
    variant === 'gastos'
      ? mensual.map((m) => m.mes)
      : variant === 'ingresos'
        ? mensualIngresos.map((m) => m.mes)
        : [
            ...new Set([
              ...mensual.map((m) => m.mes),
              ...mensualIngresos.map((m) => m.mes),
            ]),
          ];
  const window = periodsForChart(keys, getCurrentMonth(), addMonths);

  return window.map((mes) =>
    toPoint(
      mes,
      shortMonthLabel(mes, 'monthly'),
      gastoMap.get(mes),
      ingresoMap.get(mes),
    ),
  );
}

function isGastoSegment(key: unknown): key is GastoSegmentKey {
  return key === 'fijo' || key === 'variable' || key === 'prestamo';
}

function isIngresoSegment(
  key: unknown,
): key is 'no_prestamo' | 'ingresoPrestamo' {
  return key === 'no_prestamo' || key === 'ingresoPrestamo';
}

function isAirKey(key: unknown): boolean {
  return key === 'air' || key === 'airGastos' || key === 'airIngresos';
}

function segmentValue(point: ChartPoint, key: string): number {
  if (key === 'ingresoPrestamo') return point.ingresoPrestamo;
  return Number(point[key as keyof ChartPoint] ?? 0);
}

function segmentLabel(key: string, variant: ChartVariant): string {
  if (key === 'ingresoPrestamo') return 'Préstamo';
  if (key === 'no_prestamo') {
    return variant === 'combined' ? 'Ingreso' : 'No préstamo';
  }
  return SEGMENT_LABELS[key] ?? key;
}

/**
 * shared={false}: payload tiene solo el ítem bajo el cursor.
 * - segmento → ese segmento vs mismo segmento del periodo anterior
 * - air → en combined: neto ingresos−gastos; si no: total de la barra
 */
function CustomTooltip({
  active,
  payload,
  points,
  mode,
  variant,
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number; payload: ChartPoint }[];
  points: ChartPoint[];
  mode: ChartMode;
  variant: ChartVariant;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const point = item.payload;
  const dataKey = String(item.dataKey ?? '');
  const idx = points.findIndex((p) => p.key === point.key);
  const prev = idx > 0 ? points[idx - 1] : null;
  const air = isAirKey(dataKey);

  let title: string;
  let currentValue: number;
  let prevValue: number | null;

  if (air) {
    if (variant === 'combined') {
      title = `${point.label} — Total`;
      currentValue = point.net;
      prevValue = prev ? prev.net : null;
    } else if (variant === 'ingresos') {
      title = `${point.label} — Total`;
      currentValue = point.ingresoTotal;
      prevValue = prev ? prev.ingresoTotal : null;
    } else {
      title = `${point.label} — Total`;
      currentValue = point.gastoTotal;
      prevValue = prev ? prev.gastoTotal : null;
    }
  } else if (isGastoSegment(dataKey)) {
    title = `${point.label} — ${segmentLabel(dataKey, variant)}`;
    currentValue = point[dataKey];
    prevValue = prev ? prev[dataKey] : null;
  } else if (isIngresoSegment(dataKey)) {
    title = `${point.label} — ${segmentLabel(dataKey, variant)}`;
    currentValue = segmentValue(point, dataKey);
    prevValue = prev ? segmentValue(prev, dataKey) : null;
  } else {
    return null;
  }

  const pct =
    prevValue !== null ? formatPercentChange(currentValue, prevValue) : null;

  const compareLabel = mode === 'annual' ? 'año anterior' : 'mes anterior';

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--gasto-border)',
        padding: '0.75rem',
        borderRadius: 6,
      }}
    >
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div>{formatHoverCantidad(currentValue, prevValue)}</div>
      {pct && (
        <div
          style={{
            color: pct.startsWith('+')
              ? 'var(--gasto-success)'
              : 'var(--gasto-error)',
          }}
        >
          {pct} vs {compareLabel}
        </div>
      )}
    </div>
  );
}

export function ExpenseChart({
  mode,
  onModeChange,
  variant = 'gastos',
  mensual = [],
  anual = [],
  mensualIngresos = [],
  anualIngresos = [],
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const basePoints = buildPoints(
    mode,
    variant,
    mensual,
    anual,
    mensualIngresos,
    anualIngresos,
  );

  const scaleValues =
    variant === 'combined'
      ? basePoints.flatMap((p) => [p.gastoTotal, p.ingresoTotal])
      : variant === 'ingresos'
        ? basePoints.map((p) => p.ingresoTotal)
        : basePoints.map((p) => p.gastoTotal);

  const { maxY, ticks } = buildYScale(scaleValues);
  const points = basePoints.map((p) => {
    if (variant === 'combined') {
      return {
        ...p,
        airGastos: Math.max(0, maxY - p.gastoTotal),
        airIngresos: Math.max(0, maxY - p.ingresoTotal),
        air: 0,
      };
    }
    if (variant === 'ingresos') {
      return {
        ...p,
        air: Math.max(0, maxY - p.ingresoTotal),
        airGastos: 0,
        airIngresos: 0,
      };
    }
    return {
      ...p,
      air: Math.max(0, maxY - p.gastoTotal),
      airGastos: 0,
      airIngresos: 0,
    };
  });

  const currentKey = mode === 'annual' ? getCurrentYear() : getCurrentMonth();
  const pointKeys = points.map((p) => p.key).join(',');
  const colWidth = variant === 'combined' ? 88 : 52;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pointKeys) return;
    const keys = pointKeys.split(',');
    const idx = keys.indexOf(currentKey);
    if (idx < 0) return;
    const inner = el.firstElementChild as HTMLElement | null;
    if (!inner || inner.scrollWidth <= el.clientWidth) return;
    const col = inner.scrollWidth / keys.length;
    el.scrollLeft = Math.max(0, col * idx - el.clientWidth / 2 + col / 2);
  }, [pointKeys, currentKey]);

  const showGastos = variant === 'gastos' || variant === 'combined';
  const showIngresos = variant === 'ingresos' || variant === 'combined';

  if (points.length === 0) {
    return (
      <div className="card">
        <div className="chart-toggle">
          <button
            type="button"
            className={mode === 'monthly' ? 'active' : ''}
            onClick={() => onModeChange('monthly')}
          >
            Mensual
          </button>
          <button
            type="button"
            className={mode === 'annual' ? 'active' : ''}
            onClick={() => onModeChange('annual')}
          >
            Anual
          </button>
        </div>
        <div className="empty-state">No hay datos para mostrar en el gráfico.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="chart-toggle">
        <button
          type="button"
          className={mode === 'monthly' ? 'active' : ''}
          onClick={() => onModeChange('monthly')}
        >
          Mensual
        </button>
        <button
          type="button"
          className={mode === 'annual' ? 'active' : ''}
          onClick={() => onModeChange('annual')}
        >
          Anual
        </button>
      </div>
      <div className="chart-legend">
        {showGastos &&
          GASTO_SEGMENTS.map((s) => (
            <span key={`g-${s.key}`} className="legend-item">
              <span className="legend-dot" style={{ background: s.color }} />
              {variant === 'combined' ? `Gasto ${s.label.toLowerCase()}` : s.label}
            </span>
          ))}
        {showIngresos &&
          INGRESO_SEGMENTS.map((s) => (
            <span key={`i-${s.key}`} className="legend-item">
              <span className="legend-dot" style={{ background: s.color }} />
              {variant === 'combined' ? s.labelCombined : s.labelSolo}
            </span>
          ))}
      </div>
      <div
        ref={scrollRef}
        className="chart-scroll"
        tabIndex={-1}
        onPointerUp={() => {
          const active = document.activeElement;
          if (active instanceof HTMLElement) active.blur();
        }}
      >
        <div
          className="chart-scroll-inner"
          style={{ minWidth: Math.max(points.length * colWidth + 64, 280) }}
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={points}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              barCategoryGap="18%"
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="var(--gasto-border)"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--gasto-text-muted)', fontSize: 12 }}
                interval={0}
              />
              <YAxis
                width={56}
                domain={[0, maxY]}
                ticks={ticks}
                tickFormatter={(v) => formatAxisNumber(v)}
                tick={{ fill: 'var(--gasto-text-muted)', fontSize: 11 }}
              />
              <Tooltip
                shared={false}
                cursor={false}
                content={
                  <CustomTooltip
                    points={points}
                    mode={mode}
                    variant={variant}
                  />
                }
              />
              {showGastos &&
                GASTO_SEGMENTS.map((s) => (
                  <Bar
                    key={`g-${s.key}`}
                    dataKey={s.key}
                    stackId="gastos"
                    fill={s.color}
                    radius={
                      s.key === 'prestamo' && variant !== 'combined'
                        ? [4, 4, 0, 0]
                        : s.key === 'prestamo'
                          ? [4, 4, 0, 0]
                          : undefined
                    }
                    activeBar={false}
                  />
                ))}
              {showGastos && (
                <Bar
                  dataKey={variant === 'combined' ? 'airGastos' : 'air'}
                  stackId="gastos"
                  fill="transparent"
                  legendType="none"
                  isAnimationActive={false}
                  activeBar={false}
                />
              )}
              {showIngresos &&
                INGRESO_SEGMENTS.map((s) => (
                  <Bar
                    key={`i-${s.key}`}
                    dataKey={s.key}
                    stackId="ingresos"
                    fill={s.color}
                    radius={
                      s.key === 'ingresoPrestamo' ? [4, 4, 0, 0] : undefined
                    }
                    activeBar={false}
                  />
                ))}
              {showIngresos && (
                <Bar
                  dataKey={variant === 'combined' ? 'airIngresos' : 'air'}
                  stackId="ingresos"
                  fill="transparent"
                  legendType="none"
                  isAnimationActive={false}
                  activeBar={false}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export { buildAnualFromMensual } from '../utils/gastoDelta';
export { buildAnualIngresoFromMensual } from '../utils/ingresoDelta';
