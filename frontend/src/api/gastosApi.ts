import { getSessionToken } from './sessionToken';
import type {
  ConsolidadoAnual,
  ConsolidadoMensual,
  CreateGastoPayload,
  Gasto,
} from '../types/gasto';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export { API_URL };

function authHeaders(): HeadersInit {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? 'Error en la solicitud'), {
      status: res.status,
      body,
    });
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

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
