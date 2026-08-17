import { useEffect, useMemo, useState } from 'react';
import {
  daysInMonth,
  formatYmdDisplay,
  getTodayLocal,
  padYmd,
  parseYmd,
} from '../utils/dateUtils';

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function yearOptions(todayYear: number): number[] {
  const years: number[] = [];
  for (let y = 2000; y <= todayYear + 10; y += 1) years.push(y);
  return years;
}

export function DatePickerField({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: Props) {
  const today = getTodayLocal();
  const todayParts = parseYmd(today) ?? { year: 2026, month: 1, day: 1 };
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const [viewYear, setViewYear] = useState(selected?.year ?? todayParts.year);
  const [viewMonth, setViewMonth] = useState(selected?.month ?? todayParts.month);
  const [draftDay, setDraftDay] = useState(selected?.day ?? todayParts.day);

  useEffect(() => {
    if (!open) return;
    const next = parseYmd(value);
    setViewYear(next?.year ?? todayParts.year);
    setViewMonth(next?.month ?? todayParts.month);
    setDraftDay(next?.day ?? todayParts.day);
  }, [open, value, todayParts.year, todayParts.month, todayParts.day]);

  const years = useMemo(() => yearOptions(todayParts.year), [todayParts.year]);
  const maxDay = daysInMonth(viewYear, viewMonth);
  const day = Math.min(draftDay, maxDay);

  const blanks = new Date(viewYear, viewMonth - 1, 1).getDay();
  const cells = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: maxDay }, (_, i) => i + 1),
  ];

  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const canPrevMonth = viewYear > minYear || viewMonth > 1;
  const canNextMonth = viewYear < maxYear || viewMonth < 12;

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth - 1 + delta, 1);
    const y = next.getFullYear();
    const m = next.getMonth() + 1;
    if (y < minYear || y > maxYear) return;
    setViewYear(y);
    setViewMonth(m);
  };

  const confirm = (nextDay = day) => {
    onChange(padYmd(viewYear, viewMonth, nextDay));
    setOpen(false);
  };

  return (
    <div className="date-picker">
      <button
        id={id}
        type="button"
        className="date-picker-trigger"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {value ? formatYmdDisplay(value) : placeholder || 'Elegir fecha'}
      </button>

      {open && (
        <div className="date-picker-overlay" onClick={() => setOpen(false)}>
          <div
            className="date-picker-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Elegir fecha"
          >
            <div className="date-picker-selects">
              <button
                type="button"
                className="date-picker-nav"
                aria-label="Mes anterior"
                disabled={!canPrevMonth}
                onClick={() => shiftMonth(-1)}
              >
                ←
              </button>
              <select
                aria-label="Mes"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
              >
                {MONTH_LABELS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Año"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="date-picker-nav"
                aria-label="Mes siguiente"
                disabled={!canNextMonth}
                onClick={() => shiftMonth(1)}
              >
                →
              </button>
            </div>

            <div className="date-picker-weekdays">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="date-picker-grid">
              {cells.map((n, i) =>
                n == null ? (
                  <span key={`b-${i}`} />
                ) : (
                  <button
                    key={n}
                    type="button"
                    className={n === day ? 'active' : ''}
                    onClick={() => {
                      setDraftDay(n);
                      confirm(n);
                    }}
                  >
                    {n}
                  </button>
                ),
              )}
            </div>

            <div className="date-picker-actions">
              <button
                type="button"
                className="date-picker-clear"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                Borrar
              </button>
              <button type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
