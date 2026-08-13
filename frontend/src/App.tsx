import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ExpenseChart, type ChartMode } from './components/ExpenseChart';
import { MonthExpenseTable } from './components/MonthExpenseTable';
import { ConceptModal } from './components/ConceptModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { gastosApi } from './api/gastosApi';
import type { ConsolidadoAnual, ConsolidadoMensual } from './types/gasto';

function App() {
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasData = mesesConDatos.length > 0 || mensual.length > 0;

  return (
    <div className="app-container">
      <Header onAddClick={() => setShowAdd(true)} />

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
