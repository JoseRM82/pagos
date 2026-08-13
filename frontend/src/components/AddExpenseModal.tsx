import { useState } from 'react';
import type { CreateGastoPayload, Gasto, TipoGasto } from '../types/gasto';
import { gastosApi } from '../api/gastosApi';
import { getTodayLocal } from '../utils/dateUtils';
import { normalizeDecimalInput } from '../utils/formatters';

interface Props {
  onClose: () => void;
  onSuccess: (gasto: Gasto) => void;
  blockClose: boolean;
  setBlockClose: (v: boolean) => void;
}

type PanelMessage = { text: string; tone: 'muted' | 'success' | 'error' };

function ToggleGroup<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T;
  options: T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="toggle-group">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`toggle-btn ${value === opt ? 'active' : ''}`}
          onClick={() => onChange(opt)}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

export function AddExpenseModal({
  onClose,
  onSuccess,
  blockClose,
  setBlockClose,
}: Props) {
  const [fecha, setFecha] = useState('');
  const [tipo, setTipo] = useState<TipoGasto>('fijo');
  const [prestamo, setPrestamo] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [loading, setLoading] = useState(false);
  const [formMsg, setFormMsg] = useState<PanelMessage | null>(null);

  const cantidadNum = Number(normalizeDecimalInput(cantidad));
  const formValid = !Number.isNaN(cantidadNum) && cantidadNum >= 0.01;

  const handleClose = () => {
    if (blockClose) return;
    onClose();
  };

  const submitForm = async () => {
    if (!formValid || loading) return;
    setLoading(true);
    setBlockClose(true);
    setFormMsg({ text: 'Cargando datos...', tone: 'muted' });
    try {
      const payload: CreateGastoPayload = {
        tipo,
        cantidad: cantidadNum,
        prestamo,
      };
      if (fecha.trim()) payload.fecha = fecha.trim();
      if (concepto.trim()) payload.concepto = concepto.trim();

      const created = await gastosApi.createOne(payload);
      setFormMsg({ text: 'Cargado con éxito', tone: 'success' });
      setFecha('');
      setTipo('fijo');
      setPrestamo(false);
      setConcepto('');
      setCantidad('');
      onSuccess(created);
    } catch {
      alert('Hubo un error, inténtelo de nuevo en un momento');
      setFormMsg(null);
    } finally {
      setLoading(false);
      setBlockClose(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={handleClose}>
          ×
        </button>
        <h2 style={{ color: 'var(--gasto-purple)', marginTop: 0 }}>Agregar gasto</h2>

        <div className="form-field">
          <label htmlFor="fecha">Fecha (opcional, default hoy)</label>
          <input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            placeholder={getTodayLocal()}
          />
        </div>

        <div className="form-field">
          <label>Tipo de gasto</label>
          <ToggleGroup
            value={tipo}
            options={['fijo', 'variable']}
            labels={{ fijo: 'Fijo', variable: 'Variable' }}
            onChange={setTipo}
          />
        </div>

        <div className="form-field">
          <label>Préstamo</label>
          <ToggleGroup
            value={prestamo ? 'si' : 'no'}
            options={['no', 'si']}
            labels={{ si: 'Sí', no: 'No' }}
            onChange={(v) => setPrestamo(v === 'si')}
          />
        </div>

        <div className="form-field">
          <label htmlFor="concepto">Concepto (opcional)</label>
          <input
            id="concepto"
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Gasto"
          />
        </div>

        <div className="form-field">
          <label htmlFor="cantidad">Cantidad ($)</label>
          <input
            id="cantidad"
            type="text"
            inputMode="decimal"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={!formValid || loading}
          onClick={submitForm}
        >
          {loading ? 'Enviando...' : 'Guardar'}
        </button>

        {formMsg && (
          <div className={`status-msg ${formMsg.tone}`}>{formMsg.text}</div>
        )}
      </div>
    </div>
  );
}
