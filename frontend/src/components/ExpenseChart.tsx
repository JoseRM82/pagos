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
import {
  buildMonthWindow,
  buildYearWindow,
  getCurrentMonth,
  maxMonth,
} from '../utils/dateUtils';
import {
  buildYScale,
  SEGMENT_LABELS,
  shortMonthLabel,
} from '../utils/chartScale';
import {
  formatAxisNumber,
  formatCantidad,
  formatPercentChange,
} from '../utils/formatters';

export type ChartMode = 'monthly' | 'annual';

type SegmentKey = 'fijo' | 'variable' | 'prestamo';

interface ChartPoint {
  key: string;
  label: string;
  fijo: number;
  variable: number;
  prestamo: number;
  total: number;
  /** Relleno invisible hasta el tope del eje Y: hover = total de la barra. */
  air: number;
}

interface Props {
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  mensual: ConsolidadoMensual[];
  anual: ConsolidadoAnual[];
}

const SEGMENTS: { key: SegmentKey; color: string }[] = [
  { key: 'fijo', color: 'var(--gasto-purple)' },
  { key: 'variable', color: 'var(--gasto-blue)' },
  { key: 'prestamo', color: 'var(--gasto-black)' },
];

function toPoint(
  key: string,
  label: string,
  data?: { fijo: number; variable: number; prestamo: number; total: number },
): ChartPoint {
  const fijo = data?.fijo ?? 0;
  const variable = data?.variable ?? 0;
  const prestamo = data?.prestamo ?? 0;
  const total = data?.total ?? fijo + variable + prestamo;
  return {
    key,
    label,
    fijo,
    variable,
    prestamo,
    total,
    air: 0,
  };
}

function buildPoints(
  mode: ChartMode,
  mensual: ConsolidadoMensual[],
  anual: ConsolidadoAnual[],
): ChartPoint[] {
  if (mode === 'annual') {
    const map = new Map(anual.map((a) => [a.anio, a]));
    const years = buildYearWindow(anual);
    return years.map((anio) =>
      toPoint(anio, anio, map.get(anio)),
    );
  }

  const latestDataMonth =
    mensual.length > 0 ? mensual[mensual.length - 1].mes : getCurrentMonth();
  const endMonth = maxMonth(getCurrentMonth(), latestDataMonth);
  const window = buildMonthWindow(endMonth, 12);
  const map = new Map(mensual.filter((m) => m.mes).map((m) => [m.mes, m]));

  return window.map((mes) =>
    toPoint(mes, shortMonthLabel(mes, 'monthly'), map.get(mes)),
  );
}

function isSegmentKey(key: unknown): key is SegmentKey {
  return key === 'fijo' || key === 'variable' || key === 'prestamo';
}

/**
 * shared={false}: payload tiene solo el ítem bajo el cursor.
 * - color (fijo/variable/préstamo) → ese segmento
 * - air (zona vacía arriba) → total de la barra
 */
function CustomTooltip({
  active,
  payload,
  points,
  mode,
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number; payload: ChartPoint }[];
  points: ChartPoint[];
  mode: ChartMode;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const point = item.payload;
  const idx = points.findIndex((p) => p.key === point.key);
  const prev = idx > 0 ? points[idx - 1] : null;

  const segment = isSegmentKey(item.dataKey) ? item.dataKey : null;

  const currentValue = segment ? point[segment] : point.total;
  const prevValue = prev
    ? segment
      ? prev[segment]
      : prev.total
    : null;
  const pct =
    prevValue !== null ? formatPercentChange(currentValue, prevValue) : null;

  const title = segment
    ? `${point.label} — ${SEGMENT_LABELS[segment]}`
    : `${point.label} — Total`;

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
      <div>{formatCantidad(currentValue)}</div>
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

export function ExpenseChart({ mode, onModeChange, mensual, anual }: Props) {
  const basePoints = buildPoints(mode, mensual, anual);
  const { maxY, ticks } = buildYScale(basePoints.map((p) => p.total));
  const points = basePoints.map((p) => ({
    ...p,
    air: Math.max(0, maxY - p.total),
  }));

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
        {SEGMENTS.map((s) => (
          <span key={s.key} className="legend-item">
            <span className="legend-dot" style={{ background: s.color }} />
            {SEGMENT_LABELS[s.key]}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={points} margin={{ top: 10, right: 20, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--gasto-border)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--gasto-text-muted)', fontSize: 12 }} />
          <YAxis
            width={72}
            domain={[0, maxY]}
            ticks={ticks}
            tickFormatter={(v) => formatAxisNumber(v)}
            tick={{ fill: 'var(--gasto-text-muted)', fontSize: 11 }}
          />
          <Tooltip
            shared={false}
            cursor={false}
            content={<CustomTooltip points={points} mode={mode} />}
          />
          {SEGMENTS.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="gastos"
              fill={s.color}
              radius={s.key === 'prestamo' ? [4, 4, 0, 0] : undefined}
              activeBar={{ stroke: '#111', strokeWidth: 1.5 }}
            />
          ))}
          {/* Zona vacía arriba de la barra: hover → total */}
          <Bar
            dataKey="air"
            stackId="gastos"
            fill="transparent"
            legendType="none"
            isAnimationActive={false}
            activeBar={{ fill: 'rgba(0, 0, 0, 0.05)' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildAnualFromMensual(mensual: ConsolidadoMensual[]): ConsolidadoAnual[] {
  const byYear = new Map<string, ConsolidadoAnual>();
  for (const m of mensual) {
    if (!m.mes) continue;
    const anio = m.mes.slice(0, 4);
    const existing = byYear.get(anio) ?? {
      anio,
      fijo: 0,
      variable: 0,
      prestamo: 0,
      total: 0,
    };
    existing.fijo += m.fijo;
    existing.variable += m.variable;
    existing.prestamo += m.prestamo;
    existing.total += m.total;
    byYear.set(anio, existing);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export { buildAnualFromMensual };
