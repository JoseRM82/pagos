import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ExpenseChart, type ChartMode } from './components/ExpenseChart';
import {
  MonthListPanel,
  type ListDomain,
} from './components/MonthListPanel';
import { ConceptModal } from './components/ConceptModal';
import {
  AddExpenseModal,
  type EntryKind,
} from './components/AddExpenseModal';
import { LoginScreen } from './components/LoginScreen';
import { authApi } from './api/authApi';
import { listenAuthDeepLink } from './native/authDeepLink';
import { useGastosStore } from './hooks/useGastosStore';
import { useIngresosStore } from './hooks/useIngresosStore';
import type { CreateGastoPayload } from './types/gasto';
import type { CreateIngresoPayload } from './types/ingreso';
import { getTodayLocal } from './utils/dateUtils';

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authDenied, setAuthDenied] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('monthly');
  const [addKind, setAddKind] = useState<EntryKind | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<{
    concepto: string;
    domain: ListDomain;
  } | null>(null);
  const [listDomain, setListDomain] = useState<ListDomain>('gastos');
  const [blockModalClose, setBlockModalClose] = useState(false);
  const [focusMonth, setFocusMonth] = useState<string | null>(null);

  const onUnauthorized = useCallback(() => setAuthed(false), []);
  const gastos = useGastosStore(onUnauthorized);
  const ingresos = useIngresosStore(onUnauthorized);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAuthDenied(params.get('auth') === 'denied');
    const reason = params.get('reason');
    if (reason) {
      sessionStorage.setItem('auth_denied_reason', reason);
    }
    if (params.has('auth')) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    const checkMe = () =>
      authApi
        .me()
        .then((user) => setAuthed(Boolean(user)))
        .catch(() => setAuthed(false));

    void checkMe().finally(() => setAuthReady(true));

    let remove: (() => void) | undefined;
    void listenAuthDeepLink((result) => {
      if (result.ok) {
        setAuthDenied(false);
        void checkMe();
        return;
      }
      setAuthDenied(true);
      if (result.reason) {
        sessionStorage.setItem('auth_denied_reason', result.reason);
      }
      setAuthed(false);
    }).then((off) => {
      remove = off;
    });

    return () => remove?.();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!authed) {
      gastos.reset();
      ingresos.reset();
      return;
    }
    void gastos.loadInitial();
    void ingresos.loadInitial();
    // store methods are stable; only react to auth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authed]);

  const handleLogout = async () => {
    await authApi.logout();
    setAuthed(false);
  };

  const onFocusMonthApplied = useCallback(() => setFocusMonth(null), []);

  const handleCreateGasto = async (
    payload: CreateGastoPayload,
  ): Promise<boolean> => {
    setListDomain('gastos');
    setFocusMonth((payload.fecha?.trim() || getTodayLocal()).slice(0, 7));
    const created = await gastos.createGasto(payload);
    return Boolean(created);
  };

  const handleCreateIngreso = async (
    payload: CreateIngresoPayload,
  ): Promise<boolean> => {
    setListDomain('ingresos');
    setFocusMonth((payload.fecha?.trim() || getTodayLocal()).slice(0, 7));
    const created = await ingresos.createIngreso(payload);
    return Boolean(created);
  };

  if (!authReady) {
    return (
      <div className="app-container">
        <div className="status-msg muted">Cargando...</div>
      </div>
    );
  }

  if (!authed) {
    return <LoginScreen denied={authDenied} />;
  }

  const pending = gastos.pending || ingresos.pending;
  const initialLoading = gastos.initialLoading || ingresos.initialLoading;
  const hasCache =
    Object.keys(gastos.gastosByMonth).length > 0 ||
    Object.keys(ingresos.ingresosByMonth).length > 0;
  const hasData =
    gastos.mesesConDatos.length > 0 ||
    ingresos.mesesConDatos.length > 0 ||
    gastos.mensual.length > 0 ||
    ingresos.mensual.length > 0 ||
    hasCache;

  const toast = gastos.toast || ingresos.toast;
  const dismissToast = () => {
    gastos.dismissToast();
    ingresos.dismissToast();
  };

  return (
    <div className="app-container">
      <Header
        onAddGasto={() => {
          if (!pending) setAddKind('gasto');
        }}
        onAddIngreso={() => {
          if (!pending) setAddKind('ingreso');
        }}
        onLogout={() => {
          if (!pending) void handleLogout();
        }}
      />

      {initialLoading && !hasData ? (
        <div className="status-msg muted">Cargando datos...</div>
      ) : !hasData ? (
        <div className="empty-state">
          No hay movimientos cargados. Usá &quot;Agregar gasto&quot; o
          &quot;Agregar ingreso&quot; para registrar el primero.
        </div>
      ) : (
        <>
          <ExpenseChart
            mode={chartMode}
            onModeChange={setChartMode}
            variant="combined"
            mensual={gastos.mensual}
            anual={gastos.anual}
            mensualIngresos={ingresos.mensual}
            anualIngresos={ingresos.anual}
          />
          <MonthListPanel
            domain={listDomain}
            onDomainChange={setListDomain}
            mesesConDatosGastos={gastos.mesesConDatos}
            mesesConDatosIngresos={ingresos.mesesConDatos}
            consolidadoGastos={gastos.mensual}
            consolidadoIngresos={ingresos.mensual}
            gastosByMonth={gastos.gastosByMonth}
            ingresosByMonth={ingresos.ingresosByMonth}
            monthLoadingGastos={gastos.monthLoading}
            monthLoadingIngresos={ingresos.monthLoading}
            pending={pending}
            focusMonth={focusMonth}
            onFocusMonthApplied={onFocusMonthApplied}
            onConceptClick={(concepto, domain) =>
              setSelectedConcept({ concepto, domain })
            }
            ensureMonthGastos={gastos.ensureMonth}
            ensureMonthIngresos={ingresos.ensureMonth}
            onUpdateGasto={gastos.updateGasto}
            onDeleteGasto={gastos.removeGasto}
            onPagadoGasto={gastos.setPagado}
            onUpdateIngreso={ingresos.updateIngreso}
            onDeleteIngreso={ingresos.removeIngreso}
            onPagadoIngreso={ingresos.setPagado}
          />
        </>
      )}

      {addKind && (
        <AddExpenseModal
          kind={addKind}
          onClose={() => setAddKind(null)}
          onCreateGasto={handleCreateGasto}
          onCreateIngreso={handleCreateIngreso}
          blockClose={blockModalClose}
          setBlockClose={setBlockModalClose}
        />
      )}

      {selectedConcept && (
        <ConceptModal
          concepto={selectedConcept.concepto}
          domain={selectedConcept.domain}
          onClose={() => setSelectedConcept(null)}
        />
      )}

      {pending && (
        <div className="mutation-overlay" aria-busy="true" aria-live="polite">
          <div className="mutation-spinner" />
        </div>
      )}

      {toast && (
        <div className="toast toast-error" role="status" onClick={dismissToast}>
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
