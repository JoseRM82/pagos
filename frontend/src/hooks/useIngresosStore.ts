import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ingresosApi } from '../api/ingresosApi';
import type {
  ConsolidadoIngresoMensual,
  CreateIngresoPayload,
  Ingreso,
} from '../types/ingreso';
import { getCurrentMonth, getTodayLocal } from '../utils/dateUtils';
import {
  applyIngresoDelta,
  applyIngresoRowDelta,
  buildAnualIngresoFromMensual,
  cloneIngresosByMonth,
  mesesFromIngresoMensual,
  monthOf,
  normalizeIngreso,
  sameIngreso,
} from '../utils/ingresoDelta';
import { normalizeConcepto } from '../utils/normalizeConcepto';

const TOAST_MS = 4000;
const MUTATION_ERROR =
  'No se pudo guardar el cambio. Volvé a intentarlo.';

function isUnauthorized(err: unknown): boolean {
  return (err as { status?: number }).status === 401;
}

function tempId(): string {
  const rand =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `temp-${rand}`;
}

function optimisticFromPayload(payload: CreateIngresoPayload): Ingreso {
  return {
    id_ingreso: tempId(),
    fecha: payload.fecha?.trim() || getTodayLocal(),
    concepto: normalizeConcepto(payload.concepto, 'Ingreso'),
    cantidad: payload.cantidad,
    prestamo: payload.prestamo ?? false,
    pagado: payload.pagado ?? false,
  };
}

function diffIngreso(prev: Ingreso, next: Ingreso): Partial<Ingreso> {
  const payload: Partial<Ingreso> = {};
  if (next.fecha !== prev.fecha) payload.fecha = next.fecha;
  if (next.concepto !== prev.concepto) payload.concepto = next.concepto;
  if (next.cantidad !== prev.cantidad) payload.cantidad = next.cantidad;
  if (next.prestamo !== prev.prestamo) payload.prestamo = next.prestamo;
  if (next.pagado !== prev.pagado) payload.pagado = next.pagado;
  return payload;
}

export function useIngresosStore(onUnauthorized: () => void) {
  const [mensual, setMensual] = useState<ConsolidadoIngresoMensual[]>([]);
  const [ingresosByMonth, setIngresosByMonth] = useState<
    Record<string, Ingreso[]>
  >({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [monthLoading, setMonthLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const mensualRef = useRef(mensual);
  const cacheRef = useRef(ingresosByMonth);
  const pendingRef = useRef(false);
  const loadedMonthsRef = useRef(new Set<string>());
  const monthGenRef = useRef<Record<string, number>>({});
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const didLoadRef = useRef(false);

  mensualRef.current = mensual;
  cacheRef.current = ingresosByMonth;
  pendingRef.current = pending;
  onUnauthorizedRef.current = onUnauthorized;

  const anual = useMemo(() => buildAnualIngresoFromMensual(mensual), [mensual]);
  const mesesConDatos = useMemo(
    () => mesesFromIngresoMensual(mensual),
    [mensual],
  );

  const clearToastTimer = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  const showErrorToast = useCallback((text: string) => {
    clearToastTimer();
    setToast(text);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_MS);
  }, []);

  const dismissToast = useCallback(() => {
    clearToastTimer();
    setToast(null);
  }, []);

  useEffect(() => () => clearToastTimer(), []);

  const bumpMonth = (mes: string) => {
    monthGenRef.current[mes] = (monthGenRef.current[mes] ?? 0) + 1;
  };

  const commit = (
    nextMensual: ConsolidadoIngresoMensual[],
    nextCache: Record<string, Ingreso[]>,
  ) => {
    mensualRef.current = nextMensual;
    cacheRef.current = nextCache;
    setMensual(nextMensual);
    setIngresosByMonth(nextCache);
  };

  const handleAuthError = (err: unknown): boolean => {
    if (!isUnauthorized(err)) return false;
    onUnauthorizedRef.current();
    return true;
  };

  const reset = useCallback(() => {
    loadedMonthsRef.current = new Set();
    monthGenRef.current = {};
    pendingRef.current = false;
    didLoadRef.current = false;
    commit([], {});
    setPending(false);
    setMonthLoading(null);
    setInitialLoading(true);
    dismissToast();
  }, [dismissToast]);

  const loadInitial = useCallback(async () => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    const alreadyHasData = mensualRef.current.length > 0;
    if (!alreadyHasData) setInitialLoading(true);
    try {
      const m = await ingresosApi.consolidadoMensual();
      const mes = getCurrentMonth();
      const rows = await ingresosApi.porMes(mes);
      loadedMonthsRef.current.add(mes);
      const nextCache = { ...cacheRef.current };
      if (!(mes in nextCache)) {
        nextCache[mes] = rows.map(normalizeIngreso);
      }
      const nextMensual =
        mensualRef.current.length > 0 ? mensualRef.current : m;
      commit(nextMensual, nextCache);
    } catch (err: unknown) {
      didLoadRef.current = false;
      if (!handleAuthError(err)) {
        if (!alreadyHasData) commit([], {});
      }
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const ensureMonth = useCallback(async (mes: string) => {
    if (mes in cacheRef.current) {
      loadedMonthsRef.current.add(mes);
      return;
    }
    if (pendingRef.current) return;
    if (loadedMonthsRef.current.has(mes)) return;

    const gen = monthGenRef.current[mes] ?? 0;
    setMonthLoading(mes);

    try {
      const rows = await ingresosApi.porMes(mes);
      if ((monthGenRef.current[mes] ?? 0) !== gen) return;
      if (mes in cacheRef.current) {
        loadedMonthsRef.current.add(mes);
        return;
      }
      loadedMonthsRef.current.add(mes);
      const nextCache = {
        ...cacheRef.current,
        [mes]: rows.map(normalizeIngreso),
      };
      cacheRef.current = nextCache;
      setIngresosByMonth(nextCache);
    } catch (err: unknown) {
      if ((monthGenRef.current[mes] ?? 0) !== gen) return;
      if (!handleAuthError(err) && !(mes in cacheRef.current)) {
        const nextCache = { ...cacheRef.current, [mes]: [] };
        cacheRef.current = nextCache;
        setIngresosByMonth(nextCache);
      }
    } finally {
      setMonthLoading((current) => (current === mes ? null : current));
    }
  }, []);

  const runMutation = useCallback(
    async <T,>(args: {
      prev: Ingreso | null;
      next: Ingreso | null;
      request: () => Promise<T>;
    }): Promise<T | null> => {
      if (pendingRef.current) return null;

      const snapshotMensual = mensualRef.current;
      const snapshotCache = cloneIngresosByMonth(cacheRef.current);

      if (args.prev) bumpMonth(monthOf(args.prev));
      if (args.next) bumpMonth(monthOf(args.next));

      pendingRef.current = true;
      setPending(true);
      commit(
        applyIngresoDelta(snapshotMensual, args.prev, args.next),
        applyIngresoRowDelta(snapshotCache, args.prev, args.next),
      );

      try {
        return await args.request();
      } catch (err: unknown) {
        commit(snapshotMensual, snapshotCache);
        if (!handleAuthError(err)) {
          showErrorToast(MUTATION_ERROR);
        }
        return null;
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [showErrorToast],
  );

  const reconcile = (optimistic: Ingreso, server: Ingreso) => {
    const normalized = normalizeIngreso(server);
    if (sameIngreso(optimistic, normalized)) {
      if (optimistic.id_ingreso === normalized.id_ingreso) return;
    }
    commit(
      applyIngresoDelta(mensualRef.current, optimistic, normalized),
      applyIngresoRowDelta(cacheRef.current, optimistic, normalized),
    );
  };

  const createIngreso = useCallback(
    async (payload: CreateIngresoPayload): Promise<Ingreso | null> => {
      const optimistic = optimisticFromPayload(payload);
      const created = await runMutation({
        prev: null,
        next: optimistic,
        request: () => ingresosApi.createOne(payload),
      });
      if (!created) return null;
      reconcile(optimistic, created);
      return created;
    },
    [runMutation],
  );

  const updateIngreso = useCallback(
    async (prev: Ingreso, next: Ingreso): Promise<boolean> => {
      const payload = diffIngreso(prev, next);
      if (Object.keys(payload).length === 0) return true;
      const updated = await runMutation({
        prev,
        next,
        request: () => ingresosApi.update(next.id_ingreso, payload),
      });
      if (!updated) return false;
      reconcile(next, updated);
      return true;
    },
    [runMutation],
  );

  const removeIngreso = useCallback(
    async (ingreso: Ingreso): Promise<boolean> => {
      const result = await runMutation({
        prev: ingreso,
        next: null,
        request: () => ingresosApi.remove(ingreso.id_ingreso),
      });
      return result !== null;
    },
    [runMutation],
  );

  const setPagado = useCallback(
    async (ingreso: Ingreso, pagado: boolean): Promise<boolean> => {
      if (ingreso.pagado === pagado) return true;
      return updateIngreso(ingreso, { ...ingreso, pagado });
    },
    [updateIngreso],
  );

  return {
    mensual,
    anual,
    mesesConDatos,
    ingresosByMonth,
    initialLoading,
    pending,
    monthLoading,
    toast,
    dismissToast,
    reset,
    loadInitial,
    ensureMonth,
    createIngreso,
    updateIngreso,
    removeIngreso,
    setPagado,
  };
}
