import { getSessionToken } from './sessionToken';
import type {
  ConsolidadoIngresoAnual,
  ConsolidadoIngresoMensual,
  CreateIngresoPayload,
  Ingreso,
} from '../types/ingreso';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

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

export const ingresosApi = {
  createOne: (ingreso: CreateIngresoPayload) =>
    request<Ingreso>('/ingresos', {
      method: 'POST',
      body: JSON.stringify(ingreso),
    }),

  update: (id: string, data: Partial<Ingreso>) =>
    request<Ingreso>(`/ingresos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<{ ok: true }>(`/ingresos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  consolidadoMensual: () =>
    request<ConsolidadoIngresoMensual[]>('/ingresos/consolidado/mensual'),

  consolidadoAnual: () =>
    request<ConsolidadoIngresoAnual[]>('/ingresos/consolidado/anual'),

  mesesConDatos: () => request<string[]>('/ingresos/meses/con-datos'),

  porMes: (yyyyMm: string) =>
    request<Ingreso[]>(`/ingresos/por-mes/${yyyyMm}`),

  consolidadoConcepto: (concepto: string) =>
    request<ConsolidadoIngresoMensual[]>(
      `/ingresos/concepto/${encodeURIComponent(concepto)}/consolidado`,
    ),

  totalConcepto: (concepto: string) =>
    request<{ total: number }>(
      `/ingresos/concepto/${encodeURIComponent(concepto)}/total`,
    ),

  ingresosConcepto: (concepto: string, page: number, limit = 20) =>
    request<{
      data: Ingreso[];
      total: number;
      page: number;
      totalPages: number;
    }>(
      `/ingresos/concepto/${encodeURIComponent(concepto)}?page=${page}&limit=${limit}`,
    ),
};
