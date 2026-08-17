import { useEffect, useState } from 'react';
import type { ConsolidadoMensual, Gasto } from '../types/gasto';
import type {
  ConsolidadoIngresoMensual,
  Ingreso,
} from '../types/ingreso';
import { gastosApi } from '../api/gastosApi';
import { ingresosApi } from '../api/ingresosApi';
import {
  ExpenseChart,
  buildAnualFromMensual,
  buildAnualIngresoFromMensual,
  type ChartMode,
} from './ExpenseChart';
import { Pagination } from './Pagination';
import {
  formatCantidad,
  formatNumber,
  formatSiNo,
  formatTipo,
} from '../utils/formatters';
import type { ListDomain } from './MonthListPanel';

interface Props {
  concepto: string;
  domain: ListDomain;
  onClose: () => void;
}

export function ConceptModal({ concepto, domain, onClose }: Props) {
  const [chartMode, setChartMode] = useState<ChartMode>('monthly');
  const [mensualGastos, setMensualGastos] = useState<ConsolidadoMensual[]>([]);
  const [anualGastos, setAnualGastos] = useState(buildAnualFromMensual([]));
  const [mensualIngresos, setMensualIngresos] = useState<
    ConsolidadoIngresoMensual[]
  >([]);
  const [anualIngresos, setAnualIngresos] = useState(
    buildAnualIngresoFromMensual([]),
  );
  const [total, setTotal] = useState(0);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [concepto, domain]);

  useEffect(() => {
    setLoading(true);
    setError('');
    if (domain === 'gastos') {
      Promise.all([
        gastosApi.consolidadoConcepto(concepto),
        gastosApi.totalConcepto(concepto),
        gastosApi.gastosConcepto(concepto, page),
      ])
        .then(([consolidado, totalRes, paginated]) => {
          const safe = Array.isArray(consolidado) ? consolidado : [];
          setMensualGastos(safe);
          setAnualGastos(buildAnualFromMensual(safe));
          setTotal(totalRes.total);
          setGastos(paginated.data);
          setTotalPages(paginated.totalPages);
          setTotalItems(paginated.total);
        })
        .catch(() => {
          setError('No se pudieron cargar los datos del concepto.');
        })
        .finally(() => setLoading(false));
      return;
    }

    Promise.all([
      ingresosApi.consolidadoConcepto(concepto),
      ingresosApi.totalConcepto(concepto),
      ingresosApi.ingresosConcepto(concepto, page),
    ])
      .then(([consolidado, totalRes, paginated]) => {
        const safe = Array.isArray(consolidado) ? consolidado : [];
        setMensualIngresos(safe);
        setAnualIngresos(buildAnualIngresoFromMensual(safe));
        setTotal(totalRes.total);
        setIngresos(paginated.data);
        setTotalPages(paginated.totalPages);
        setTotalItems(paginated.total);
      })
      .catch(() => {
        setError('No se pudieron cargar los datos del concepto.');
      })
      .finally(() => setLoading(false));
  }, [concepto, domain, page]);

  const titleColor =
    domain === 'gastos' ? 'var(--gasto-purple)' : 'var(--ingreso-celeste)';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 style={{ color: titleColor, marginTop: 0 }}>{concepto}</h2>
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
              variant={domain === 'gastos' ? 'gastos' : 'ingresos'}
              mensual={mensualGastos}
              anual={anualGastos}
              mensualIngresos={mensualIngresos}
              anualIngresos={anualIngresos}
            />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>fecha</th>
                    {domain === 'gastos' && <th>tipo</th>}
                    <th>cantidad</th>
                    <th>prestamo</th>
                    <th>pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {domain === 'gastos'
                    ? gastos.map((g) => (
                        <tr key={g.id_gasto}>
                          <td>{g.fecha}</td>
                          <td>{formatTipo(g.tipo)}</td>
                          <td>{formatCantidad(g.cantidad)}</td>
                          <td>{formatSiNo(g.prestamo)}</td>
                          <td>{formatSiNo(g.pagado)}</td>
                        </tr>
                      ))
                    : ingresos.map((g) => (
                        <tr key={g.id_ingreso}>
                          <td>{g.fecha}</td>
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
