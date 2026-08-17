export interface ShoppingItem {
  id: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  precioFinal: number;
  createdAt: number;
}

export type ShoppingSortMode = 'ingreso' | 'nombre' | 'precioFinal';

export interface ShoppingCartState {
  items: ShoppingItem[];
  sortMode: ShoppingSortMode;
}
