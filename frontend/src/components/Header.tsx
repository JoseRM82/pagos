export type AppMode = 'finanzas' | 'calculadora';

interface Props {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onAddGasto: () => void;
  onAddIngreso: () => void;
  onLogout: () => void;
}

export function Header({
  mode,
  onModeChange,
  onAddGasto,
  onAddIngreso,
  onLogout,
}: Props) {
  return (
    <header className="header">
      <div className="header-main">
        <h1>{mode === 'finanzas' ? 'Gastos e ingresos' : 'Calculadora de compra'}</h1>
        <div className="header-mode-toggle toggle-group">
          <button
            type="button"
            className={`toggle-btn ${mode === 'finanzas' ? 'active' : ''}`}
            onClick={() => onModeChange('finanzas')}
          >
            Finanzas
          </button>
          <button
            type="button"
            className={`toggle-btn ${mode === 'calculadora' ? 'active' : ''}`}
            onClick={() => onModeChange('calculadora')}
          >
            Calculadora
          </button>
        </div>
      </div>
      <div className="header-actions">
        <button type="button" className="btn-secondary" onClick={onLogout}>
          Salir
        </button>
        {mode === 'finanzas' && (
          <>
            <button type="button" className="btn-secondary" onClick={onAddIngreso}>
              Agregar ingreso
            </button>
            <button type="button" className="btn-primary" onClick={onAddGasto}>
              Agregar gasto
            </button>
          </>
        )}
      </div>
    </header>
  );
}
