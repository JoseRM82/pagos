import { useEffect, useRef, useState } from 'react';
import type { ConsolidadoMensual, Gasto, TipoGasto } from '../types/gasto';
import { TIPOS_GASTO } from '../types/gasto';
import type { ConsolidadoIngresoMensual, Ingreso } from '../types/ingreso';
import { addMonths, formatMonthYear, getCurrentMonth } from '../utils/dateUtils';
import {
  formatCantidad,
  formatMonthTotal,
  formatSiNo,
  formatTipo,
  normalizeDecimalInput,
} from '../utils/formatters';

export type ListDomain = 'gastos' | 'ingresos';

interface Props {
  domain: ListDomain;
  onDomainChange: (domain: ListDomain) => void;
  mesesConDatosGastos: string[];
  mesesConDatosIngresos: string[];
  consolidadoGastos: ConsolidadoMensual[];
  consolidadoIngresos: ConsolidadoIngresoMensual[];
  gastosByMonth: Record<string, Gasto[]>;
  ingresosByMonth: Record<string, Ingreso[]>;
  monthLoadingGastos: string | null;
  monthLoadingIngresos: string | null;
  pending: boolean;
  focusMonth?: string | null;
  onFocusMonthApplied?: () => void;
  onConceptClick: (concepto: string, domain: ListDomain) => void;
  ensureMonthGastos: (mes: string) => Promise<void>;
  ensureMonthIngresos: (mes: string) => Promise<void>;
  onUpdateGasto: (prev: Gasto, next: Gasto) => Promise<boolean>;
  onDeleteGasto: (gasto: Gasto) => Promise<boolean>;
  onPagadoGasto: (gasto: Gasto, pagado: boolean) => Promise<boolean>;
  onUpdateIngreso: (prev: Ingreso, next: Ingreso) => Promise<boolean>;
  onDeleteIngreso: (ingreso: Ingreso) => Promise<boolean>;
  onPagadoIngreso: (ingreso: Ingreso, pagado: boolean) => Promise<boolean>;
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

export function MonthListPanel({
  domain,
  onDomainChange,
  mesesConDatosGastos,
  mesesConDatosIngresos,
  consolidadoGastos,
  consolidadoIngresos,
  gastosByMonth,
  ingresosByMonth,
  monthLoadingGastos,
  monthLoadingIngresos,
  pending,
  focusMonth,
  onFocusMonthApplied,
  onConceptClick,
  ensureMonthGastos,
  ensureMonthIngresos,
  onUpdateGasto,
  onDeleteGasto,
  onPagadoGasto,
  onUpdateIngreso,
  onDeleteIngreso,
  onPagadoIngreso,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(
    () => focusMonth || getCurrentMonth(),
  );
  const [editingGastoId, setEditingGastoId] = useState<string | null>(null);
  const [editGastoDraft, setEditGastoDraft] = useState<Gasto | null>(null);
  const [editGastoOriginal, setEditGastoOriginal] = useState<Gasto | null>(null);
  const [editingIngresoId, setEditingIngresoId] = useState<string | null>(null);
  const [editIngresoDraft, setEditIngresoDraft] = useState<Ingreso | null>(null);
  const [editIngresoOriginal, setEditIngresoOriginal] =
    useState<Ingreso | null>(null);

  const ensureGastosRef = useRef(ensureMonthGastos);
  const ensureIngresosRef = useRef(ensureMonthIngresos);
  ensureGastosRef.current = ensureMonthGastos;
  ensureIngresosRef.current = ensureMonthIngresos;

  useEffect(() => {
    if (!focusMonth) return;
    setSelectedMonth(focusMonth);
    onFocusMonthApplied?.();
  }, [focusMonth, onFocusMonthApplied]);

  useEffect(() => {
    if (domain === 'gastos') void ensureGastosRef.current(selectedMonth);
    else void ensureIngresosRef.current(selectedMonth);
  }, [selectedMonth, domain]);

  const mesesConDatos =
    domain === 'gastos' ? mesesConDatosGastos : mesesConDatosIngresos;
  const prevMonth = addMonths(selectedMonth, -1);
  const nextMonth = addMonths(selectedMonth, 1);
  const canPrev = mesesConDatos.some((m) => m < selectedMonth);
  const canNext = mesesConDatos.some((m) => m > selectedMonth);

  const gastosCached = gastosByMonth[selectedMonth];
  const gastos = gastosCached ?? [];
  const gastosLoading =
    monthLoadingGastos === selectedMonth && gastosCached === undefined;
  const gastoTotal =
    consolidadoGastos.find((c) => c.mes === selectedMonth)?.total ??
    gastos.reduce((sum, g) => sum + g.cantidad, 0);

  const ingresosCached = ingresosByMonth[selectedMonth];
  const ingresos = ingresosCached ?? [];
  const ingresosLoading =
    monthLoadingIngresos === selectedMonth && ingresosCached === undefined;
  const ingresoTotal =
    consolidadoIngresos.find((c) => c.mes === selectedMonth)?.total ??
    ingresos.reduce((sum, g) => sum + g.cantidad, 0);

  const monthTotal = domain === 'gastos' ? gastoTotal : ingresoTotal;
  const loading = domain === 'gastos' ? gastosLoading : ingresosLoading;

  const goMonth = (mes: string) => {
    setSelectedMonth(mes);
    setEditingGastoId(null);
    setEditingIngresoId(null);
    if (domain === 'gastos') void ensureGastosRef.current(mes);
    else void ensureIngresosRef.current(mes);
  };

  const switchDomain = (next: ListDomain) => {
    setEditingGastoId(null);
    setEditingIngresoId(null);
    onDomainChange(next);
  };

  return (
    <div className="card">
      <div className="list-tabs">
        <button
          type="button"
          className={domain === 'gastos' ? 'active' : ''}
          disabled={pending}
          onClick={() => switchDomain('gastos')}
        >
          Gastos
        </button>
        <button
          type="button"
          className={domain === 'ingresos' ? 'active' : ''}
          disabled={pending}
          onClick={() => switchDomain('ingresos')}
        >
          Ingresos
        </button>
      </div>

      <div className="month-nav">
        <button
          type="button"
          disabled={!canPrev || pending}
          onClick={() => goMonth(prevMonth)}
        >
          ←
        </button>
        <h2>
          {formatMonthYear(selectedMonth)} {formatMonthTotal(monthTotal)}
        </h2>
        <button
          type="button"
          disabled={!canNext || pending}
          onClick={() => goMonth(nextMonth)}
        >
          →
        </button>
      </div>

      {loading ? (
        <div className="status-msg muted">Cargando datos...</div>
      ) : domain === 'gastos' ? (
        gastos.length === 0 ? (
          <div className="empty-state">No hay gastos en este mes.</div>
        ) : (
          <GastoTable
            gastos={gastos}
            pending={pending}
            editingId={editingGastoId}
            editDraft={editGastoDraft}
            editOriginal={editGastoOriginal}
            setEditingId={setEditingGastoId}
            setEditDraft={setEditGastoDraft}
            setEditOriginal={setEditGastoOriginal}
            onConceptClick={(c) => onConceptClick(c, 'gastos')}
            onUpdate={onUpdateGasto}
            onDelete={onDeleteGasto}
            onPagadoToggle={onPagadoGasto}
          />
        )
      ) : ingresos.length === 0 ? (
        <div className="empty-state">No hay ingresos en este mes.</div>
      ) : (
        <IngresoTable
          ingresos={ingresos}
          pending={pending}
          editingId={editingIngresoId}
          editDraft={editIngresoDraft}
          editOriginal={editIngresoOriginal}
          setEditingId={setEditingIngresoId}
          setEditDraft={setEditIngresoDraft}
          setEditOriginal={setEditIngresoOriginal}
          onConceptClick={(c) => onConceptClick(c, 'ingresos')}
          onUpdate={onUpdateIngreso}
          onDelete={onDeleteIngreso}
          onPagadoToggle={onPagadoIngreso}
        />
      )}
    </div>
  );
}

function GastoTable({
  gastos,
  pending,
  editingId,
  editDraft,
  editOriginal,
  setEditingId,
  setEditDraft,
  setEditOriginal,
  onConceptClick,
  onUpdate,
  onDelete,
  onPagadoToggle,
}: {
  gastos: Gasto[];
  pending: boolean;
  editingId: string | null;
  editDraft: Gasto | null;
  editOriginal: Gasto | null;
  setEditingId: (id: string | null) => void;
  setEditDraft: (g: Gasto | null) => void;
  setEditOriginal: (g: Gasto | null) => void;
  onConceptClick: (concepto: string) => void;
  onUpdate: (prev: Gasto, next: Gasto) => Promise<boolean>;
  onDelete: (gasto: Gasto) => Promise<boolean>;
  onPagadoToggle: (gasto: Gasto, pagado: boolean) => Promise<boolean>;
}) {
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
                    onChange={(v) => {
                      if (pending || gasto.pagado === v) return;
                      void onPagadoToggle(gasto, v);
                    }}
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
                      onClick={() => void submitEdit()}
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
                      onClick={() => void handleDelete(gasto)}
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
  );
}

function IngresoTable({
  ingresos,
  pending,
  editingId,
  editDraft,
  editOriginal,
  setEditingId,
  setEditDraft,
  setEditOriginal,
  onConceptClick,
  onUpdate,
  onDelete,
  onPagadoToggle,
}: {
  ingresos: Ingreso[];
  pending: boolean;
  editingId: string | null;
  editDraft: Ingreso | null;
  editOriginal: Ingreso | null;
  setEditingId: (id: string | null) => void;
  setEditDraft: (g: Ingreso | null) => void;
  setEditOriginal: (g: Ingreso | null) => void;
  onConceptClick: (concepto: string) => void;
  onUpdate: (prev: Ingreso, next: Ingreso) => Promise<boolean>;
  onDelete: (ingreso: Ingreso) => Promise<boolean>;
  onPagadoToggle: (ingreso: Ingreso, pagado: boolean) => Promise<boolean>;
}) {
  const startEdit = (ingreso: Ingreso) => {
    setEditingId(ingreso.id_ingreso);
    setEditDraft({ ...ingreso });
    setEditOriginal({ ...ingreso });
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

  const handleDelete = async (ingreso: Ingreso) => {
    if (pending) return;
    if (!confirm(`¿Eliminar el ingreso "${ingreso.concepto}"?`)) return;
    await onDelete(ingreso);
  };

  const renderCell = (
    ingreso: Ingreso,
    field: keyof Ingreso,
    type: 'text' | 'number' | 'bool' = 'text',
  ) => {
    if (editingId !== ingreso.id_ingreso || !editDraft) {
      if (field === 'cantidad') return formatCantidad(ingreso.cantidad);
      if (field === 'prestamo') return formatSiNo(ingreso.prestamo);
      if (field === 'pagado') return formatSiNo(ingreso.pagado);
      return String(ingreso[field]);
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
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>fecha</th>
            <th>concepto</th>
            <th>cantidad</th>
            <th>prestamo</th>
            <th>pagado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {ingresos.map((ingreso) => (
            <tr key={ingreso.id_ingreso}>
              <td>{renderCell(ingreso, 'fecha')}</td>
              <td>
                {editingId === ingreso.id_ingreso ? (
                  renderCell(ingreso, 'concepto')
                ) : (
                  <button
                    type="button"
                    className="link-concepto"
                    disabled={pending}
                    onClick={() => onConceptClick(ingreso.concepto)}
                  >
                    {ingreso.concepto}
                  </button>
                )}
              </td>
              <td>{renderCell(ingreso, 'cantidad', 'number')}</td>
              <td>
                {editingId === ingreso.id_ingreso
                  ? renderCell(ingreso, 'prestamo', 'bool')
                  : formatSiNo(ingreso.prestamo)}
              </td>
              <td>
                {editingId === ingreso.id_ingreso ? (
                  renderCell(ingreso, 'pagado', 'bool')
                ) : (
                  <PagadoToggle
                    value={ingreso.pagado}
                    disabled={pending}
                    onChange={(v) => {
                      if (pending || ingreso.pagado === v) return;
                      void onPagadoToggle(ingreso, v);
                    }}
                  />
                )}
              </td>
              <td>
                {editingId === ingreso.id_ingreso ? (
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
                      onClick={() => void submitEdit()}
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
                      onClick={() => startEdit(ingreso)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={pending}
                      onClick={() => void handleDelete(ingreso)}
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
  );
}
