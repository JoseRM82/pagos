import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ShoppingItem, ShoppingSortMode } from '../types/shopping';

const STORAGE_KEY = 'shopping_cart_v1';

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function mergeKey(nombre: string, precioUnitario: number): string {
  return `${normalizeName(nombre)}|${precioUnitario.toFixed(2)}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeFinal(precioUnitario: number, cantidad: number): number {
  return roundMoney(precioUnitario * cantidad);
}

function sortItems(
  items: ShoppingItem[],
  sortMode: ShoppingSortMode,
): ShoppingItem[] {
  const copy = [...items];
  if (sortMode === 'nombre') {
    copy.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
    );
  } else if (sortMode === 'precioFinal') {
    copy.sort((a, b) => b.precioFinal - a.precioFinal);
  }
  return copy;
}

function loadFromStorage(): { items: ShoppingItem[]; sortMode: ShoppingSortMode } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], sortMode: 'ingreso' };
    const parsed = JSON.parse(raw) as {
      items?: ShoppingItem[];
      sortMode?: ShoppingSortMode;
    };
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      sortMode: parsed.sortMode ?? 'ingreso',
    };
  } catch {
    return { items: [], sortMode: 'ingreso' };
  }
}

function saveToStorage(items: ShoppingItem[], sortMode: ShoppingSortMode): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, sortMode }));
}

export function useShoppingCart() {
  const [items, setItems] = useState<ShoppingItem[]>(() => loadFromStorage().items);
  const [sortMode, setSortMode] = useState<ShoppingSortMode>(
    () => loadFromStorage().sortMode,
  );

  useEffect(() => {
    saveToStorage(items, sortMode);
  }, [items, sortMode]);

  const sortedItems = useMemo(
    () => sortItems(items, sortMode),
    [items, sortMode],
  );

  const total = useMemo(
    () => roundMoney(items.reduce((sum, item) => sum + item.precioFinal, 0)),
    [items],
  );

  const addItem = useCallback(
    (payload: { nombre: string; precioUnitario: number; cantidad: number }) => {
      const nombre = payload.nombre.trim();
      const precioUnitario = roundMoney(payload.precioUnitario);
      const cantidad = payload.cantidad;
      if (!nombre || precioUnitario < 0.01 || cantidad < 0.01) return false;

      const key = mergeKey(nombre, precioUnitario);
      setItems((prev) => {
        const existing = prev.find(
          (item) => mergeKey(item.nombre, item.precioUnitario) === key,
        );
        if (existing) {
          const nextQty = existing.cantidad + cantidad;
          return prev.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  cantidad: nextQty,
                  precioFinal: computeFinal(item.precioUnitario, nextQty),
                }
              : item,
          );
        }
        const newItem: ShoppingItem = {
          id: crypto.randomUUID(),
          nombre,
          precioUnitario,
          cantidad,
          precioFinal: computeFinal(precioUnitario, cantidad),
          createdAt: Date.now(),
        };
        return [...prev, newItem];
      });
      return true;
    },
    [],
  );

  const updateItem = useCallback(
    (
      id: string,
      payload: { nombre: string; precioUnitario: number; cantidad: number },
    ) => {
      const nombre = payload.nombre.trim();
      const precioUnitario = roundMoney(payload.precioUnitario);
      const cantidad = payload.cantidad;
      if (!nombre || precioUnitario < 0.01 || cantidad < 0.01) return false;

      setItems((prev) => {
        const current = prev.find((item) => item.id === id);
        if (!current) return prev;

        const key = mergeKey(nombre, precioUnitario);
        const duplicate = prev.find(
          (item) =>
            item.id !== id && mergeKey(item.nombre, item.precioUnitario) === key,
        );

        if (duplicate) {
          const mergedQty = duplicate.cantidad + cantidad;
          return prev
            .filter((item) => item.id !== id)
            .map((item) =>
              item.id === duplicate.id
                ? {
                    ...item,
                    cantidad: mergedQty,
                    precioFinal: computeFinal(item.precioUnitario, mergedQty),
                  }
                : item,
            );
        }

        return prev.map((item) =>
          item.id === id
            ? {
                ...item,
                nombre,
                precioUnitario,
                cantidad,
                precioFinal: computeFinal(precioUnitario, cantidad),
              }
            : item,
        );
      });
      return true;
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const resetCart = useCallback(() => {
    setItems([]);
    setSortMode('ingreso');
  }, []);

  return {
    items: sortedItems,
    sortMode,
    setSortMode,
    total,
    addItem,
    updateItem,
    removeItem,
    resetCart,
    itemCount: items.length,
  };
}
