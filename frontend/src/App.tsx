import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ExpenseChart, type ChartMode } from './components/ExpenseChart';
import { MonthExpenseTable } from './components/MonthExpenseTable';
import { ConceptModal } from './components/ConceptModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { LoginScreen } from './components/LoginScreen';
import { authApi } from './api/authApi';
import { listenAuthDeepLink } from './native/authDeepLink';
import { useGastosStore } from './hooks/useGastosStore';
import type { CreateGastoPayload } from './types/gasto';
import { getTodayLocal } from './utils/dateUtils';

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authDenied, setAuthDenied] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('monthly');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [blockModalClose, setBlockModalClose] = useState(false);
  const [focusMonth, setFocusMonth] = useState<string | null>(null);

  const onUnauthorized = useCallback(() => setAuthed(false), []);
  const store = useGastosStore(onUnauthorized);

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
      store.reset();
      return;
    }
    void store.loadInitial();
    // store methods are stable; only react to auth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authed]);

  const handleLogout = async () => {
    await authApi.logout();
    setAuthed(false);
  };

  const onFocusMonthApplied = useCallback(() => setFocusMonth(null), []);

  const handleCreate = async (payload: CreateGastoPayload): Promise<boolean> => {
    setFocusMonth((payload.fecha?.trim() || getTodayLocal()).slice(0, 7));
    const created = await store.createGasto(payload);
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

  const hasCache = Object.keys(store.gastosByMonth).length > 0;
  const hasData = store.mesesConDatos.length > 0 || store.mensual.length > 0 || hasCache;

  return (
    <div className="app-container">
      <Header
        onAddClick={() => {
          if (!store.pending) setShowAdd(true);
        }}
        onLogout={() => {
          if (!store.pending) void handleLogout();
        }}
      />

      {store.initialLoading && !hasData ? (
        <div className="status-msg muted">Cargando datos...</div>
      ) : !hasData ? (
        <div className="empty-state">
          No hay gastos cargados. Usá &quot;Agregar gasto&quot; para registrar el
          primero.
        </div>
      ) : (
        <>
          <ExpenseChart
            mode={chartMode}
            onModeChange={setChartMode}
            mensual={store.mensual}
            anual={store.anual}
          />
          <MonthExpenseTable
            mesesConDatos={store.mesesConDatos}
            consolidadoMensual={store.mensual}
            gastosByMonth={store.gastosByMonth}
            monthLoading={store.monthLoading}
            pending={store.pending}
            focusMonth={focusMonth}
            onFocusMonthApplied={onFocusMonthApplied}
            onConceptClick={setSelectedConcept}
            ensureMonth={store.ensureMonth}
            onUpdate={store.updateGasto}
            onDelete={store.removeGasto}
            onPagadoToggle={store.setPagado}
          />
        </>
      )}

      {showAdd && (
        <AddExpenseModal
          onClose={() => setShowAdd(false)}
          onCreate={handleCreate}
          blockClose={blockModalClose}
          setBlockClose={setBlockModalClose}
        />
      )}

      {selectedConcept && (
        <ConceptModal
          concepto={selectedConcept}
          onClose={() => setSelectedConcept(null)}
        />
      )}

      {store.pending && (
        <div className="mutation-overlay" aria-busy="true" aria-live="polite">
          <div className="mutation-spinner" />
        </div>
      )}

      {store.toast && (
        <div className="toast toast-error" role="status" onClick={store.dismissToast}>
          {store.toast}
        </div>
      )}
    </div>
  );
}

export default App;
