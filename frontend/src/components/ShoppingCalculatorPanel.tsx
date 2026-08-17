import { useState } from 'react';
import type { ShoppingItem, ShoppingSortMode } from '../types/shopping';
import { formatCantidad } from '../utils/formatters';
import { AddShoppingItemModal } from './AddShoppingItemModal';

interface Props {
  items: ShoppingItem[];
  sortMode: ShoppingSortMode;
  total: number;
  onSortModeChange: (mode: ShoppingSortMode) => void;
  onAddItem: (payload: {
    nombre: string;
    precioUnitario: number;
    cantidad: number;
  }) => boolean;
  onUpdateItem: (
    id: string,
    payload: { nombre: string; precioUnitario: number; cantidad: number },
  ) => boolean;
  onRemoveItem: (id: string) => void;
  onResetCart: () => void;
}

const SORT_LABELS: Record<ShoppingSortMode, string> = {
  ingreso: 'Ingreso',
  nombre: 'Nombre',
  precioFinal: 'Total',
};

export function ShoppingCalculatorPanel({
  items,
  sortMode,
  total,
  onSortModeChange,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onResetCart,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

  const handleReset = () => {
    if (items.length === 0) return;
    const ok = window.confirm(
      '¿Reiniciar la lista de compra? Se borrarán todos los productos.',
    );
    if (ok) onResetCart();
  };

  return (
    <section className="shopping-panel">
      <div className="shopping-total-bar">
        <span className="shopping-total-label">Total de la compra</span>
        <span className="shopping-total-value">{formatCantidad(total)}</span>
      </div>

      <div className="shopping-toolbar">
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          Agregar producto
        </button>
        <div className="shopping-sort">
          <span className="shopping-sort-label">Ordenar:</span>
          <div className="toggle-group">
            {(Object.keys(SORT_LABELS) as ShoppingSortMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`toggle-btn ${sortMode === mode ? 'active' : ''}`}
                onClick={() => onSortModeChange(mode)}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          La lista está vacía. Agregá productos escribiendo los datos o
          fotografiando una etiqueta de góndola.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio x uni</th>
                <th>Cant.</th>
                <th>Total</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{formatCantidad(item.precioUnitario)}</td>
                  <td>{item.cantidad}</td>
                  <td>{formatCantidad(item.precioFinal)}</td>
                  <td className="shopping-actions">
                    <button
                      type="button"
                      className="btn-table"
                      onClick={() => setEditingItem(item)}
                    >
                      Modificar
                    </button>
                    <button
                      type="button"
                      className="btn-table btn-table-danger"
                      onClick={() => {
                        const ok = window.confirm(
                          `¿Eliminar "${item.nombre}" de la lista?`,
                        );
                        if (ok) onRemoveItem(item.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <div className="shopping-reset-wrap">
          <button
            type="button"
            className="btn-secondary btn-danger-outline"
            onClick={handleReset}
          >
            Reiniciar lista
          </button>
        </div>
      )}

      {showAddModal && (
        <AddShoppingItemModal
          onClose={() => setShowAddModal(false)}
          onSave={onAddItem}
        />
      )}

      {editingItem && (
        <AddShoppingItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(payload) => onUpdateItem(editingItem.id, payload)}
        />
      )}
    </section>
  );
}
