import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { ShoppingItem } from '../types/shopping';
import {
  readShelfLabelFromCamera,
  readShelfLabelFromGallery,
  type ReadShelfLabelResult,
} from '../native/readShelfLabel';
import { formatCantidad, normalizeDecimalInput } from '../utils/formatters';

type PanelMessage = { text: string; tone: 'muted' | 'success' | 'error' };

interface Props {
  item?: ShoppingItem | null;
  onClose: () => void;
  onSave: (payload: {
    nombre: string;
    precioUnitario: number;
    cantidad: number;
  }) => boolean;
}

function formatPriceInput(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
}

function ToggleGroup<T extends string>({
  value,
  options,
  labels,
  onChange,
  disabled,
}: {
  value: T;
  options: T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="toggle-group">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`toggle-btn ${value === opt ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange(opt)}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

export function AddShoppingItemModal({ item, onClose, onSave }: Props) {
  const isEdit = Boolean(item);
  const [nombre, setNombre] = useState(item?.nombre ?? '');
  const [precioManual, setPrecioManual] = useState(
    item ? formatPriceInput(item.precioUnitario) : '',
  );
  const [detectedPrecios, setDetectedPrecios] = useState<number[]>([]);
  const [selectedPrecioIndex, setSelectedPrecioIndex] = useState(0);
  const [cantidad, setCantidad] = useState(
    item ? String(item.cantidad) : '1',
  );
  const [reading, setReading] = useState(false);
  const [formMsg, setFormMsg] = useState<PanelMessage | null>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (detectedPrecios.length === 0) return;
    if (selectedPrecioIndex >= detectedPrecios.length) {
      setSelectedPrecioIndex(0);
    }
  }, [detectedPrecios, selectedPrecioIndex]);

  const precioManualNum = Number(normalizeDecimalInput(precioManual));
  const hasManualPrecio =
    precioManual.trim() !== '' &&
    !Number.isNaN(precioManualNum) &&
    precioManualNum >= 0.01;

  const effectivePrecio = hasManualPrecio
    ? precioManualNum
    : detectedPrecios[selectedPrecioIndex];

  const cantidadNum = Number(normalizeDecimalInput(cantidad));
  const formValid =
    nombre.trim().length > 0 &&
    effectivePrecio != null &&
    effectivePrecio >= 0.01 &&
    !Number.isNaN(cantidadNum) &&
    cantidadNum >= 0.01;

  const busy = reading;

  const applyReadResult = (result: ReadShelfLabelResult) => {
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
        text: 'No se detectó el nombre del producto. Completalo manualmente.',
        tone: 'error',
      });
      return;
    }

    setNombre(result.nombre);
    setDetectedPrecios(result.precios);
    setSelectedPrecioIndex(0);
    if (result.precios.length === 0) {
      setFormMsg({
        text: 'Se copió el nombre. Ingresá el precio manualmente.',
        tone: 'muted',
      });
    } else if (result.precios.length === 1) {
      setFormMsg({
        text: 'Se detectó nombre y precio. Revisá y confirmá.',
        tone: 'muted',
      });
    } else {
      setFormMsg({
        text: 'Se detectaron dos precios. Elegí cuál usar o escribí uno.',
        tone: 'muted',
      });
    }
  };

  const readLabel = async (source: 'camera' | 'gallery') => {
    if (busy) return;
    setReading(true);
    setFormMsg({
      text:
        source === 'camera'
          ? 'Abriendo cámara...'
          : 'Leyendo etiqueta...',
      tone: 'muted',
    });
    try {
      const result =
        source === 'camera'
          ? await readShelfLabelFromCamera()
          : await readShelfLabelFromGallery();
      applyReadResult(result);
    } finally {
      setReading(false);
    }
  };

  const clearDetectedPrecios = () => {
    setDetectedPrecios([]);
    setSelectedPrecioIndex(0);
    setFormMsg({
      text: 'Precios detectados eliminados. Podés escribir el precio.',
      tone: 'muted',
    });
  };

  const handleSave = () => {
    if (!formValid) return;
    const ok = onSave({
      nombre: nombre.trim(),
      precioUnitario: effectivePrecio,
      cantidad: cantidadNum,
    });
    if (ok) onClose();
  };

  const precioToggleOptions = detectedPrecios.map((_, index) => String(index));
  const precioToggleLabels = Object.fromEntries(
    detectedPrecios.map((price, index) => [
      String(index),
      formatCantidad(price),
    ]),
  ) as Record<string, string>;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 style={{ color: 'var(--gasto-purple)', marginTop: 0 }}>
          {isEdit ? 'Modificar producto' : 'Agregar producto'}
        </h2>

        {isNative && (
          <div className="comprobante-actions">
            <button
              type="button"
              className="btn-secondary btn-comprobante"
              disabled={busy}
              onClick={() => void readLabel('camera')}
            >
              {reading ? 'Leyendo...' : 'Tomar foto'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-comprobante"
              disabled={busy}
              onClick={() => void readLabel('gallery')}
            >
              {reading ? 'Leyendo...' : 'Desde galería'}
            </button>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="shopping-nombre">Nombre</label>
          <input
            id="shopping-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Producto"
            disabled={busy}
          />
        </div>

        {detectedPrecios.length > 0 && !hasManualPrecio && (
          <div className="form-field">
            <label>Precio detectado</label>
            {detectedPrecios.length === 1 ? (
              <div className="status-msg muted">
                {formatCantidad(detectedPrecios[0])}
              </div>
            ) : (
              <ToggleGroup
                value={String(selectedPrecioIndex)}
                options={precioToggleOptions}
                labels={precioToggleLabels}
                onChange={(v) => setSelectedPrecioIndex(Number(v))}
                disabled={busy}
              />
            )}
            <button
              type="button"
              className="btn-link"
              disabled={busy}
              onClick={clearDetectedPrecios}
            >
              Borrar precios detectados
            </button>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="shopping-precio">
            Precio unitario ($)
            {hasManualPrecio && detectedPrecios.length > 0 && (
              <span className="field-hint"> — prioriza lo escrito</span>
            )}
          </label>
          <input
            id="shopping-precio"
            type="text"
            inputMode="decimal"
            value={precioManual}
            onChange={(e) => setPrecioManual(e.target.value)}
            placeholder={
              detectedPrecios.length > 0 && !hasManualPrecio
                ? formatPriceInput(detectedPrecios[selectedPrecioIndex])
                : '0,00'
            }
            disabled={busy}
          />
        </div>

        <div className="form-field">
          <label htmlFor="shopping-cantidad">Cantidad</label>
          <input
            id="shopping-cantidad"
            type="text"
            inputMode="decimal"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="1"
            disabled={busy}
          />
        </div>

        {formValid && (
          <div className="shopping-preview-total">
            Subtotal: {formatCantidad(effectivePrecio * cantidadNum)}
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          disabled={!formValid || busy}
          onClick={handleSave}
        >
          {isEdit ? 'Guardar cambios' : 'Agregar a la lista'}
        </button>

        {formMsg && (
          <div className={`status-msg ${formMsg.tone}`}>{formMsg.text}</div>
        )}
      </div>
    </div>
  );
}
