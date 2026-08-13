const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? 'Error en la solicitud'), {
      status: res.status,
      body,
    });
  }
  return res.json() as Promise<T>;
}

import type {
  ConsolidadoAnual,
  ConsolidadoMensual,
  CreateGastoPayload,
  Gasto,
} from '../types/gasto';

export const gastosApi = {
  createOne: (gasto: CreateGastoPayload) =>
    request<Gasto>('/gastos', {
      method: 'POST',
      body: JSON.stringify(gasto),
    }),

  update: (id: string, data: Partial<Gasto>) =>
    request<Gasto>(`/gastos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<{ ok: true }>(`/gastos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  consolidadoMensual: () =>
    request<ConsolidadoMensual[]>('/gastos/consolidado/mensual'),

  consolidadoAnual: () =>
    request<ConsolidadoAnual[]>('/gastos/consolidado/anual'),

  mesesConDatos: () => request<string[]>('/gastos/meses/con-datos'),

  porMes: (yyyyMm: string) =>
    request<Gasto[]>(`/gastos/por-mes/${yyyyMm}`),

  consolidadoConcepto: (concepto: string) =>
    request<ConsolidadoMensual[]>(
      `/gastos/concepto/${encodeURIComponent(concepto)}/consolidado`,
    ),

  totalConcepto: (concepto: string) =>
    request<{ total: number }>(
      `/gastos/concepto/${encodeURIComponent(concepto)}/total`,
    ),

  gastosConcepto: (concepto: string, page: number, limit = 20) =>
    request<{
      data: Gasto[];
      total: number;
      page: number;
      totalPages: number;
    }>(
      `/gastos/concepto/${encodeURIComponent(concepto)}?page=${page}&limit=${limit}`,
    ),
};
