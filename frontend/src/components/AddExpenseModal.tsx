import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { CreateGastoPayload, TipoGasto } from '../types/gasto';
import { getTodayLocal } from '../utils/dateUtils';
import { normalizeDecimalInput } from '../utils/formatters';
import {
  readComprobanteFromCamera,
  readComprobanteFromGallery,
  type ReadComprobanteResult,
} from '../native/readComprobante';
import { DatePickerField } from './DatePickerField';

interface Props {
  onClose: () => void;
  onCreate: (gasto: CreateGastoPayload) => Promise<boolean>;
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

function formatCantidadInput(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function AddExpenseModal({
  onClose,
  onCreate,
  blockClose,
  setBlockClose,
}: Props) {
  const [fecha, setFecha] = useState('');
  const [tipo, setTipo] = useState<TipoGasto>('fijo');
  const [prestamo, setPrestamo] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [formMsg, setFormMsg] = useState<PanelMessage | null>(null);
  const isNative = Capacitor.isNativePlatform();

  const cantidadNum = Number(normalizeDecimalInput(cantidad));
  const formValid = !Number.isNaN(cantidadNum) && cantidadNum >= 0.01;
  const busy = loading || reading;

  const handleClose = () => {
    if (blockClose) return;
    onClose();
  };

  const applyReadResult = (result: ReadComprobanteResult) => {
    if (!result.ok) {
      if (result.reason === 'cancelled') {
        setFormMsg(null);
        return;
      }
      if (result.reason === 'app_error') {
        setFormMsg({
          text: 'No se pudo leer la imagen. Probá de nuevo en un momento.',
          tone: 'error',
        });
        return;
      }
      if (result.reason === 'unreadable') {
        setFormMsg({
          text: 'La imagen no se pudo leer.',
          tone: 'error',
        });
        return;
      }
      setFormMsg({
        text: 'No se reconoció como un comprobante de transferencia.',
        tone: 'error',
      });
      return;
    }

    setCantidad(formatCantidadInput(result.cantidad));
    setFecha(result.fecha ?? '');
    setFormMsg({
      text: result.fecha
        ? 'Se completaron monto y fecha. Revisá el resto y guardá.'
        : 'Se completó el monto. Revisá el resto y guardá.',
      tone: 'muted',
    });
  };

  const readComprobante = async (source: 'camera' | 'gallery') => {
    if (busy) return;
    setReading(true);
    setBlockClose(true);
    setFormMsg({
      text:
        source === 'camera'
          ? 'Abriendo cámara...'
          : 'Leyendo comprobante...',
      tone: 'muted',
    });
    try {
      const result =
        source === 'camera'
          ? await readComprobanteFromCamera()
          : await readComprobanteFromGallery();
      applyReadResult(result);
    } finally {
      setReading(false);
      setBlockClose(false);
    }
  };

  const submitForm = async () => {
    if (!formValid || busy) return;
    setLoading(true);
    setBlockClose(true);
    setFormMsg({ text: 'Cargando datos...', tone: 'muted' });
    let ok = false;
    try {
      const payload: CreateGastoPayload = {
        tipo,
        cantidad: cantidadNum,
        prestamo,
      };
      if (fecha.trim()) payload.fecha = fecha.trim();
      if (concepto.trim()) payload.concepto = concepto.trim();

      ok = await onCreate(payload);
      if (!ok) {
        setFormMsg({
          text: 'No se pudo guardar el cambio. Volvé a intentarlo.',
          tone: 'error',
        });
      }
    } catch {
      setFormMsg({
        text: 'No se pudo guardar el cambio. Volvé a intentarlo.',
        tone: 'error',
      });
    } finally {
      setLoading(false);
      setBlockClose(false);
    }
    if (ok) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={handleClose}>
          ×
        </button>
        <h2 style={{ color: 'var(--gasto-purple)', marginTop: 0 }}>Agregar gasto</h2>

        {isNative && (
          <div className="comprobante-actions">
            <button
              type="button"
              className="btn-secondary btn-comprobante"
              disabled={busy}
              onClick={() => void readComprobante('camera')}
            >
              {reading ? 'Leyendo...' : 'Tomar foto'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-comprobante"
              disabled={busy}
              onClick={() => void readComprobante('gallery')}
            >
              {reading ? 'Leyendo...' : 'Desde galería'}
            </button>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="fecha">Fecha (opcional, default hoy)</label>
          <DatePickerField
            id="fecha"
            value={fecha}
            onChange={setFecha}
            placeholder={getTodayLocal()}
            disabled={busy}
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
            disabled={busy}
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
            disabled={busy}
          />
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={!formValid || busy}
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
