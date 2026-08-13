import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ExpenseChart, type ChartMode } from './components/ExpenseChart';
import { MonthExpenseTable } from './components/MonthExpenseTable';
import { ConceptModal } from './components/ConceptModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { LoginScreen } from './components/LoginScreen';
import { authApi } from './api/authApi';
import { gastosApi } from './api/gastosApi';
import { listenAuthDeepLink } from './native/authDeepLink';
import type { ConsolidadoAnual, ConsolidadoMensual } from './types/gasto';

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authDenied, setAuthDenied] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('monthly');
  const [mensual, setMensual] = useState<ConsolidadoMensual[]>([]);
  const [anual, setAnual] = useState<ConsolidadoAnual[]>([]);
  const [mesesConDatos, setMesesConDatos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [blockModalClose, setBlockModalClose] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [focusMonth, setFocusMonth] = useState<string | null>(null);

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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a, meses] = await Promise.all([
        gastosApi.consolidadoMensual(),
        gastosApi.consolidadoAnual(),
        gastosApi.mesesConDatos(),
      ]);
      setMensual(m);
      setAnual(a);
      setMesesConDatos(meses);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    void refresh();
  }, [authed, refresh]);

  const handleLogout = async () => {
    await authApi.logout();
    setAuthed(false);
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

  const hasData = mesesConDatos.length > 0 || mensual.length > 0;

  return (
    <div className="app-container">
      <Header onAddClick={() => setShowAdd(true)} onLogout={() => void handleLogout()} />

      {loading && !hasData ? (
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
            mensual={mensual}
            anual={anual}
          />
          <MonthExpenseTable
            mesesConDatos={mesesConDatos}
            consolidadoMensual={mensual}
            refreshKey={refreshKey}
            focusMonth={focusMonth}
            onFocusMonthApplied={() => setFocusMonth(null)}
            onConceptClick={setSelectedConcept}
            onMonthChange={() => void refresh()}
          />
        </>
      )}

      {showAdd && (
        <AddExpenseModal
          onClose={() => setShowAdd(false)}
          onSuccess={(gasto) => {
            setFocusMonth(gasto.fecha.slice(0, 7));
            void refresh();
          }}
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
    </div>
  );
}

export default App;
