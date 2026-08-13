import { useEffect, useRef, useState } from 'react';
import type { ConsolidadoMensual, Gasto, TipoGasto } from '../types/gasto';
import { TIPOS_GASTO } from '../types/gasto';
import { gastosApi } from '../api/gastosApi';
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
  refreshKey: number;
  focusMonth?: string | null;
  onFocusMonthApplied?: () => void;
  onConceptClick: (concepto: string) => void;
  onMonthChange?: () => void;
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
  refreshKey,
  focusMonth,
  onFocusMonthApplied,
  onConceptClick,
  onMonthChange,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const hasInitializedMonth = useRef(false);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Gasto | null>(null);
  const [editOriginal, setEditOriginal] = useState<Gasto | null>(null);
  const [sending, setSending] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (mesesConDatos.length === 0) {
      hasInitializedMonth.current = false;
      return;
    }
    if (!hasInitializedMonth.current && !focusMonth) {
      setSelectedMonth(mesesConDatos[mesesConDatos.length - 1]);
      hasInitializedMonth.current = true;
    }
  }, [mesesConDatos, focusMonth]);

  useEffect(() => {
    if (!focusMonth) return;
    setSelectedMonth(focusMonth);
    hasInitializedMonth.current = true;
    onFocusMonthApplied?.();
  }, [focusMonth, onFocusMonthApplied]);

  useEffect(() => {
    setLoading(true);
    gastosApi
      .porMes(selectedMonth)
      .then(setGastos)
      .catch(() => setGastos([]))
      .finally(() => setLoading(false));
  }, [selectedMonth, refreshKey]);

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
    if (!editDraft || !editOriginal) return;
    setSending(true);
    try {
      const payload: Partial<Gasto> = {};
      if (editDraft.fecha !== editOriginal.fecha) payload.fecha = editDraft.fecha;
      if (editDraft.tipo !== editOriginal.tipo) payload.tipo = editDraft.tipo;
      if (editDraft.concepto !== editOriginal.concepto)
        payload.concepto = editDraft.concepto;
      if (editDraft.cantidad !== editOriginal.cantidad)
        payload.cantidad = editDraft.cantidad;
      if (editDraft.prestamo !== editOriginal.prestamo)
        payload.prestamo = editDraft.prestamo;
      if (editDraft.pagado !== editOriginal.pagado)
        payload.pagado = editDraft.pagado;

      const updated = await gastosApi.update(editDraft.id_gasto, payload);
      setGastos((rows) =>
        rows.map((r) => (r.id_gasto === updated.id_gasto ? updated : r)),
      );
      cancelEdit();
      alert('Enviado con éxito');
      if (Object.keys(payload).length > 0) {
        onMonthChange?.();
      }
    } catch {
      if (editOriginal) {
        setGastos((rows) =>
          rows.map((r) =>
            r.id_gasto === editOriginal.id_gasto ? editOriginal : r,
          ),
        );
      }
      cancelEdit();
      alert('Ocurrió un error, inténtelo nuevamente en un momento');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (gasto: Gasto) => {
    if (!confirm(`¿Eliminar el gasto "${gasto.concepto}"?`)) return;
    setSending(true);
    try {
      await gastosApi.remove(gasto.id_gasto);
      setGastos((rows) => rows.filter((r) => r.id_gasto !== gasto.id_gasto));
      onMonthChange?.();
    } catch {
      alert('No se pudo eliminar el gasto');
    } finally {
      setSending(false);
    }
  };

  const handlePagadoToggle = async (gasto: Gasto, pagado: boolean) => {
    if (gasto.pagado === pagado) return;
    setTogglingId(gasto.id_gasto);
    try {
      const updated = await gastosApi.update(gasto.id_gasto, { pagado });
      setGastos((rows) =>
        rows.map((r) => (r.id_gasto === updated.id_gasto ? updated : r)),
      );
      onMonthChange?.();
    } catch {
      alert('No se pudo actualizar el estado de pago');
    } finally {
      setTogglingId(null);
    }
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
          onChange={(v) => setEditDraft({ ...editDraft, [field]: v })}
        />
      );
    }

    return (
      <input
        className="inline-input"
        type={type === 'number' ? 'text' : type}
        value={String(editDraft[field])}
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
          disabled={!canPrev}
          onClick={() => setSelectedMonth(prevMonth)}
        >
          ←
        </button>
        <h2>
          {formatMonthYear(selectedMonth)} {formatMonthTotal(monthTotal)}
        </h2>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setSelectedMonth(nextMonth)}
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
                        disabled={togglingId === gasto.id_gasto}
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
                          disabled={sending}
                          onClick={cancelEdit}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={sending}
                          onClick={submitEdit}
                        >
                          {sending ? 'Enviando...' : 'Enviar'}
                        </button>
                      </div>
                    ) : (
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => startEdit(gasto)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          disabled={sending}
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
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-group">
      <button
        type="button"
        className={`toggle-btn ${!value ? 'active' : ''}`}
        onClick={() => onChange(false)}
      >
        No
      </button>
      <button
        type="button"
        className={`toggle-btn ${value ? 'active' : ''}`}
        onClick={() => onChange(true)}
      >
        Sí
      </button>
    </div>
  );
}
