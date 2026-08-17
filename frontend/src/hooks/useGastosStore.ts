import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gastosApi } from '../api/gastosApi';
import type { ConsolidadoMensual, CreateGastoPayload, Gasto } from '../types/gasto';
import { getCurrentMonth, getTodayLocal } from '../utils/dateUtils';
import {
  applyGastoDelta,
  applyRowDelta,
  buildAnualFromMensual,
  cloneGastosByMonth,
  mesesFromMensual,
  monthOf,
  normalizeGasto,
  sameGasto,
} from '../utils/gastoDelta';
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

function optimisticFromPayload(payload: CreateGastoPayload): Gasto {
  return {
    id_gasto: tempId(),
    fecha: payload.fecha?.trim() || getTodayLocal(),
    tipo: payload.tipo,
    concepto: normalizeConcepto(payload.concepto),
    cantidad: payload.cantidad,
    prestamo: payload.prestamo ?? false,
    pagado: payload.pagado ?? false,
  };
}

function diffGasto(prev: Gasto, next: Gasto): Partial<Gasto> {
  const payload: Partial<Gasto> = {};
  if (next.fecha !== prev.fecha) payload.fecha = next.fecha;
  if (next.tipo !== prev.tipo) payload.tipo = next.tipo;
  if (next.concepto !== prev.concepto) payload.concepto = next.concepto;
  if (next.cantidad !== prev.cantidad) payload.cantidad = next.cantidad;
  if (next.prestamo !== prev.prestamo) payload.prestamo = next.prestamo;
  if (next.pagado !== prev.pagado) payload.pagado = next.pagado;
  return payload;
}

export function useGastosStore(onUnauthorized: () => void) {
  const [mensual, setMensual] = useState<ConsolidadoMensual[]>([]);
  const [gastosByMonth, setGastosByMonth] = useState<Record<string, Gasto[]>>(
    {},
  );
  const [initialLoading, setInitialLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [monthLoading, setMonthLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const mensualRef = useRef(mensual);
  const cacheRef = useRef(gastosByMonth);
  const pendingRef = useRef(false);
  const loadedMonthsRef = useRef(new Set<string>());
  const monthGenRef = useRef<Record<string, number>>({});
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const didLoadRef = useRef(false);

  mensualRef.current = mensual;
  cacheRef.current = gastosByMonth;
  pendingRef.current = pending;
  onUnauthorizedRef.current = onUnauthorized;

  const anual = useMemo(() => buildAnualFromMensual(mensual), [mensual]);
  const mesesConDatos = useMemo(() => mesesFromMensual(mensual), [mensual]);

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
    nextMensual: ConsolidadoMensual[],
    nextCache: Record<string, Gasto[]>,
  ) => {
    mensualRef.current = nextMensual;
    cacheRef.current = nextCache;
    setMensual(nextMensual);
    setGastosByMonth(nextCache);
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
      const m = await gastosApi.consolidadoMensual();
      const mes = getCurrentMonth();
      const rows = await gastosApi.porMes(mes);
      loadedMonthsRef.current.add(mes);
      const nextCache = { ...cacheRef.current };
      if (!(mes in nextCache)) {
        nextCache[mes] = rows.map(normalizeGasto);
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
      const rows = await gastosApi.porMes(mes);
      if ((monthGenRef.current[mes] ?? 0) !== gen) return;
      if (mes in cacheRef.current) {
        loadedMonthsRef.current.add(mes);
        return;
      }
      loadedMonthsRef.current.add(mes);
      const nextCache = {
        ...cacheRef.current,
        [mes]: rows.map(normalizeGasto),
      };
      cacheRef.current = nextCache;
      setGastosByMonth(nextCache);
    } catch (err: unknown) {
      if ((monthGenRef.current[mes] ?? 0) !== gen) return;
      if (!handleAuthError(err) && !(mes in cacheRef.current)) {
        const nextCache = { ...cacheRef.current, [mes]: [] };
        cacheRef.current = nextCache;
        setGastosByMonth(nextCache);
      }
    } finally {
      setMonthLoading((current) => (current === mes ? null : current));
    }
  }, []);

  const runMutation = useCallback(
    async <T,>(args: {
      prev: Gasto | null;
      next: Gasto | null;
      request: () => Promise<T>;
    }): Promise<T | null> => {
      if (pendingRef.current) return null;

      const snapshotMensual = mensualRef.current;
      const snapshotCache = cloneGastosByMonth(cacheRef.current);

      if (args.prev) bumpMonth(monthOf(args.prev));
      if (args.next) bumpMonth(monthOf(args.next));

      pendingRef.current = true;
      setPending(true);
      commit(
        applyGastoDelta(snapshotMensual, args.prev, args.next),
        applyRowDelta(snapshotCache, args.prev, args.next),
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

  const reconcile = (optimistic: Gasto, server: Gasto) => {
    const normalized = normalizeGasto(server);
    if (sameGasto(optimistic, normalized)) {
      if (optimistic.id_gasto === normalized.id_gasto) return;
    }
    commit(
      applyGastoDelta(mensualRef.current, optimistic, normalized),
      applyRowDelta(cacheRef.current, optimistic, normalized),
    );
  };

  const createGasto = useCallback(
    async (payload: CreateGastoPayload): Promise<Gasto | null> => {
      const optimistic = optimisticFromPayload(payload);
      const created = await runMutation({
        prev: null,
        next: optimistic,
        request: () => gastosApi.createOne(payload),
      });
      if (!created) return null;
      reconcile(optimistic, created);
      return created;
    },
    [runMutation],
  );

  const updateGasto = useCallback(
    async (prev: Gasto, next: Gasto): Promise<boolean> => {
      const payload = diffGasto(prev, next);
      if (Object.keys(payload).length === 0) return true;
      const updated = await runMutation({
        prev,
        next,
        request: () => gastosApi.update(next.id_gasto, payload),
      });
      if (!updated) return false;
      reconcile(next, updated);
      return true;
    },
    [runMutation],
  );

  const removeGasto = useCallback(
    async (gasto: Gasto): Promise<boolean> => {
      const result = await runMutation({
        prev: gasto,
        next: null,
        request: () => gastosApi.remove(gasto.id_gasto),
      });
      return result !== null;
    },
    [runMutation],
  );

  const setPagado = useCallback(
    async (gasto: Gasto, pagado: boolean): Promise<boolean> => {
      if (gasto.pagado === pagado) return true;
      return updateGasto(gasto, { ...gasto, pagado });
    },
    [updateGasto],
  );

  return {
    mensual,
    anual,
    mesesConDatos,
    gastosByMonth,
    initialLoading,
    pending,
    monthLoading,
    toast,
    dismissToast,
    reset,
    loadInitial,
    ensureMonth,
    createGasto,
    updateGasto,
    removeGasto,
    setPagado,
  };
}
