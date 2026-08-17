import { useEffect, useRef, useState } from 'react';
import type { ConsolidadoMensual, Gasto, TipoGasto } from '../types/gasto';
import { TIPOS_GASTO } from '../types/gasto';
import { addMonths, formatMonthYear, getCurrentMonth } from '../utils/dateUtils';
import {
  formatCantidad,
  formatMonthTotal,
  formatSiNo,
  formatTipo,
  normalizeDecimalInput,
} from '../utils/formatters';

interface Props {
  mesesConDatos: string[];
  consolidadoMensual: ConsolidadoMensual[];
  gastosByMonth: Record<string, Gasto[]>;
  monthLoading: string | null;
  pending: boolean;
  focusMonth?: string | null;
  onFocusMonthApplied?: () => void;
  onConceptClick: (concepto: string) => void;
  ensureMonth: (mes: string) => Promise<void>;
  onUpdate: (prev: Gasto, next: Gasto) => Promise<boolean>;
  onDelete: (gasto: Gasto) => Promise<boolean>;
  onPagadoToggle: (gasto: Gasto, pagado: boolean) => Promise<boolean>;
}

function PagadoToggle({
  value,
  disabled,
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="pagado-toggle">
      <button
        type="button"
        className={!value ? 'active-no' : ''}
        disabled={disabled}
        onClick={() => onChange(false)}
      >
        No
      </button>
      <button
        type="button"
        className={value ? 'active-yes' : ''}
        disabled={disabled}
        onClick={() => onChange(true)}
      >
        Sí
      </button>
    </div>
  );
}

export function MonthExpenseTable({
  mesesConDatos,
  consolidadoMensual,
  gastosByMonth,
  monthLoading,
  pending,
  focusMonth,
  onFocusMonthApplied,
  onConceptClick,
  ensureMonth,
  onUpdate,
  onDelete,
  onPagadoToggle,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(
    () => focusMonth || getCurrentMonth(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Gasto | null>(null);
  const [editOriginal, setEditOriginal] = useState<Gasto | null>(null);
  const ensureMonthRef = useRef(ensureMonth);
  ensureMonthRef.current = ensureMonth;

  useEffect(() => {
    if (!focusMonth) return;
    setSelectedMonth(focusMonth);
    onFocusMonthApplied?.();
  }, [focusMonth, onFocusMonthApplied]);

  useEffect(() => {
    void ensureMonthRef.current(selectedMonth);
  }, [selectedMonth]);

  const cached = gastosByMonth[selectedMonth];
  const gastos = cached ?? [];
  const loading = monthLoading === selectedMonth && cached === undefined;

  const monthTotal =
    consolidadoMensual.find((c) => c.mes === selectedMonth)?.total ??
    gastos.reduce((sum, g) => sum + g.cantidad, 0);

  const prevMonth = addMonths(selectedMonth, -1);
  const nextMonth = addMonths(selectedMonth, 1);
  const canPrev = mesesConDatos.some((m) => m < selectedMonth);
  const canNext = mesesConDatos.some((m) => m > selectedMonth);

  const startEdit = (gasto: Gasto) => {
    setEditingId(gasto.id_gasto);
    setEditDraft({ ...gasto });
    setEditOriginal({ ...gasto });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setEditOriginal(null);
  };

  const submitEdit = async () => {
    if (!editDraft || !editOriginal || pending) return;
    await onUpdate(editOriginal, editDraft);
    cancelEdit();
  };

  const handleDelete = async (gasto: Gasto) => {
    if (pending) return;
    if (!confirm(`¿Eliminar el gasto "${gasto.concepto}"?`)) return;
    await onDelete(gasto);
  };

  const handlePagadoToggle = async (gasto: Gasto, pagado: boolean) => {
    if (pending || gasto.pagado === pagado) return;
    await onPagadoToggle(gasto, pagado);
  };

  const renderCell = (
    gasto: Gasto,
    field: keyof Gasto,
    type: 'text' | 'number' | 'select' | 'bool' = 'text',
  ) => {
    if (editingId !== gasto.id_gasto || !editDraft) {
      if (field === 'cantidad') return formatCantidad(gasto.cantidad);
      if (field === 'tipo') return formatTipo(gasto.tipo);
      if (field === 'prestamo') return formatSiNo(gasto.prestamo);
      if (field === 'pagado') return formatSiNo(gasto.pagado);
      return String(gasto[field]);
    }

    if (type === 'select' && field === 'tipo') {
      return (
        <select
          className="inline-input"
          value={editDraft.tipo}
          disabled={pending}
          onChange={(e) =>
            setEditDraft({ ...editDraft, tipo: e.target.value as TipoGasto })
          }
        >
          {TIPOS_GASTO.map((t) => (
            <option key={t} value={t}>
              {formatTipo(t)}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'bool') {
      return (
        <ToggleBool
          value={Boolean(editDraft[field])}
          disabled={pending}
          onChange={(v) => setEditDraft({ ...editDraft, [field]: v })}
        />
      );
    }

    return (
      <input
        className="inline-input"
        type={type === 'number' ? 'text' : type}
        value={String(editDraft[field])}
        disabled={pending}
        onChange={(e) =>
          setEditDraft({
            ...editDraft,
            [field]:
              type === 'number'
                ? Number(normalizeDecimalInput(e.target.value))
                : e.target.value,
          })
        }
      />
    );
  };

  return (
    <div className="card">
      <div className="month-nav">
        <button
          type="button"
          disabled={!canPrev || pending}
          onClick={() => {
            setSelectedMonth(prevMonth);
            void ensureMonthRef.current(prevMonth);
          }}
        >
          ←
        </button>
        <h2>
          {formatMonthYear(selectedMonth)} {formatMonthTotal(monthTotal)}
        </h2>
        <button
          type="button"
          disabled={!canNext || pending}
          onClick={() => {
            setSelectedMonth(nextMonth);
            void ensureMonthRef.current(nextMonth);
          }}
        >
          →
        </button>
      </div>

      {loading ? (
        <div className="status-msg muted">Cargando datos...</div>
      ) : gastos.length === 0 ? (
        <div className="empty-state">No hay gastos en este mes.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>fecha</th>
                <th>tipo</th>
                <th>concepto</th>
                <th>cantidad</th>
                <th>prestamo</th>
                <th>pagado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {gastos.map((gasto) => (
                <tr key={gasto.id_gasto}>
                  <td>{renderCell(gasto, 'fecha')}</td>
                  <td>{renderCell(gasto, 'tipo', 'select')}</td>
                  <td>
                    {editingId === gasto.id_gasto ? (
                      renderCell(gasto, 'concepto')
                    ) : (
                      <button
                        type="button"
                        className="link-concepto"
                        disabled={pending}
                        onClick={() => onConceptClick(gasto.concepto)}
                      >
                        {gasto.concepto}
                      </button>
                    )}
                  </td>
                  <td>{renderCell(gasto, 'cantidad', 'number')}</td>
                  <td>
                    {editingId === gasto.id_gasto
                      ? renderCell(gasto, 'prestamo', 'bool')
                      : formatSiNo(gasto.prestamo)}
                  </td>
                  <td>
                    {editingId === gasto.id_gasto ? (
                      renderCell(gasto, 'pagado', 'bool')
                    ) : (
                      <PagadoToggle
                        value={gasto.pagado}
                        disabled={pending}
                        onChange={(v) => handlePagadoToggle(gasto, v)}
                      />
                    )}
                  </td>
                  <td>
                    {editingId === gasto.id_gasto ? (
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={pending}
                          onClick={cancelEdit}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={pending}
                          onClick={submitEdit}
                        >
                          {pending ? 'Enviando...' : 'Enviar'}
                        </button>
                      </div>
                    ) : (
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={pending}
                          onClick={() => startEdit(gasto)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          disabled={pending}
                          onClick={() => handleDelete(gasto)}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ToggleBool({
  value,
  disabled,
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-group">
      <button
        type="button"
        className={`toggle-btn ${!value ? 'active' : ''}`}
        disabled={disabled}
        onClick={() => onChange(false)}
      >
        No
      </button>
      <button
        type="button"
        className={`toggle-btn ${value ? 'active' : ''}`}
        disabled={disabled}
        onClick={() => onChange(true)}
      >
        Sí
      </button>
    </div>
  );
}
