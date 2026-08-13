import { useEffect, useState } from 'react';
import type { ConsolidadoMensual, Gasto } from '../types/gasto';
import { gastosApi } from '../api/gastosApi';
import {
  ExpenseChart,
  buildAnualFromMensual,
  type ChartMode,
} from './ExpenseChart';
import { Pagination } from './Pagination';
import {
  formatCantidad,
  formatNumber,
  formatSiNo,
  formatTipo,
} from '../utils/formatters';

interface Props {
  concepto: string;
  onClose: () => void;
}

export function ConceptModal({ concepto, onClose }: Props) {
  const [chartMode, setChartMode] = useState<ChartMode>('monthly');
  const [mensual, setMensual] = useState<ConsolidadoMensual[]>([]);
  const [anual, setAnual] = useState(buildAnualFromMensual([]));
  const [total, setTotal] = useState(0);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      gastosApi.consolidadoConcepto(concepto),
      gastosApi.totalConcepto(concepto),
      gastosApi.gastosConcepto(concepto, page),
    ])
      .then(([consolidado, totalRes, paginated]) => {
        const safeConsolidado = Array.isArray(consolidado) ? consolidado : [];
        setMensual(safeConsolidado);
        setAnual(buildAnualFromMensual(safeConsolidado));
        setTotal(totalRes.total);
        setGastos(paginated.data);
        setTotalPages(paginated.totalPages);
        setTotalItems(paginated.total);
      })
      .catch(() => {
        setError('No se pudieron cargar los datos del concepto.');
      })
      .finally(() => setLoading(false));
  }, [concepto, page]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 style={{ color: 'var(--gasto-purple)', marginTop: 0 }}>{concepto}</h2>
        <p style={{ fontWeight: 600 }}>Total: ${formatNumber(total)}</p>

        {loading ? (
          <div className="status-msg muted">Cargando datos...</div>
        ) : error ? (
          <div className="status-msg error">{error}</div>
        ) : (
          <>
            <ExpenseChart
              mode={chartMode}
              onModeChange={setChartMode}
              mensual={mensual}
              anual={anual}
            />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>fecha</th>
                    <th>tipo</th>
                    <th>cantidad</th>
                    <th>prestamo</th>
                    <th>pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((g) => (
                    <tr key={g.id_gasto}>
                      <td>{g.fecha}</td>
                      <td>{formatTipo(g.tipo)}</td>
                      <td>{formatCantidad(g.cantidad)}</td>
                      <td>{formatSiNo(g.prestamo)}</td>
                      <td>{formatSiNo(g.pagado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
